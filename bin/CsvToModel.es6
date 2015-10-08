/************************************************************************
 *  PROJECT: csv-parse-model
 *  CREATED ON: 08.10.15 16:51
 *  AUTHOR: Michael
 ************************************************************************/
import Promise from 'bluebird';
import _ from 'lodash';
import _fs from 'fs';
const fs = Promise.promisifyAll(_fs);
import {NotFoundError, ModelNotFoundError, NoInputFile} from './../Exceptions/ExceptionsMain';
import Stream from 'stream';
const liner = new Stream.Transform({objectMode: true});

export default class Csv2Model {
    constructor(options = {}) {
        this.file = options.file;
        this.options = Object.assign({
            separator: '\t',
            lineEnding: '\n',
            enclosedBy: '\"',
            encoding: 'utf8',
            ignoreLines: 1
        }, options);

        this.options._separator = JSON.stringify(options.separator);
    }

    parse(obj = {}) {
        return Promise.resolve(this.options.firstLine
            .split(obj.separator || this.options.separator)
            .map(val => val.trim()))
            .then(firstLine => {
                let result = new Map(),
                    length = firstLine.length,
                    insertMap = new Map(),
                    setSet = new Set();
                obj.columns = obj.columns || this.options.columns;
                Object.keys(obj.columns)
                    .filter(key => (obj.columns[key].find || obj.columns[key].defaultValue))
                    .forEach(val => {
                        let options = obj.columns[val];
                        options.name = val;
                        options.shouldVariable = '';
                        if (options.find && ! ~ firstLine.indexOf(options.find) && options.alias instanceof Array) {
                            let x = 0;
                            options.find = options.alias.some((alias, i) => {
                                x = i;
                                return ~ firstLine.indexOf(alias)
                            }) ? options.alias[x] : false;
                            // if nothing is found in find and alias, throw
                            if (! options.find) {
                                throw new NotFoundError(val + ' has no finder');
                            }
                        }
                        if (~ firstLine.indexOf(options.find)) {
                            options.indexes = firstLine.indexOf(options.find);
                            options.shouldVariable = options.valueOptions ? '@' : '';
                            if (options.valueOptions) {
                                setSet.add(options.shouldVariable + val);
                            }
                            insertMap.set(options.indexes, options.shouldVariable + val);
                        } else {
                            if (! options.find) {
                                if (! options.defaultValue) throw new NotFoundError('No index found for ' + options.find);
                                options.addSet = val;
                                setSet.add(options.shouldVariable + val);
                            }
                        }

                        result.set(options.shouldVariable + val, options);
                    });
                return [result, insertMap, setSet, length];
            }).spread((res, inserts, sets, length) => {
                let insertsMap = new Map(),
                    columnsString,
                    setsString = '';
                for (let [i,field] of this.makeQueryDummy(0, length, 1)) {
                    insertsMap.set(i, inserts.has(i) ? inserts.get(i) : field);
                }
                columnsString = Array.from(insertsMap.values())
                    .toString().replace(/(,@dummy)+$/, '');

                for (let key of sets.keys()) {
                    setsString += key.replace('@', '') + '=' +
                        (res.get(key).defaultValue ?
                        '"' + (res.get(key).defaultValue + '", ') :
                        (Object.keys(res.get(key).valueOptions)[0] + '(' + res.get(key).valueOptions[Object.keys(res.get(key).valueOptions)[0]]).replace(/(:\w+)/, key) + '), ');
                }
                setsString = setsString.replace(/(, )+$/, '');
                if (! obj.createLoadString) {
                    return [columnsString, setsString];
                }
                obj = Object.assign(obj, this.options);
                return this.loadDataInfileString(obj.file, columnsString, setsString, obj)
            });
        /* .catch(NotFoundError, err => log(err))
         .catch(ModelNotFoundError, err => log(err))
         .catch(NoInputFile, err => log(err))
         .catch(Error, err => log(err))*/
    }

    read(groupBy = false, options = {}) {
        options = Object.assign({
            separator: this.options.separator,
            lineEnding: this.options.lineEnding,
            enclosedBy: this.options.enclosedBy,
            encoding: this.options.encoding,
            ignoreLines: this.options.ignoreLines,
            file: this.file,
            columns: this.options.columns
        }, options);
        let deferred = Promise.pending();
        Promise.all([
            fs.createReadStream(options.file, options.encoding),
            this.options.firstLine
                .split(options.separator)
                .map(val => val.trim()),
            Object.keys(options.columns)
                .filter(val => (options.columns[val].find || options.columns[val].defaultValue))
        ])
            .spread((file, firstLine, columns) => {
                let result = [];
                liner._transform = function (chunk, encoding, done) {
                    let data = chunk.toString();
                    if (this._lastLineData) data = this._lastLineData + data;
                    let lines = data.split(options.lineEnding);
                    this._lastLineData = lines.splice(lines.length - 1, 1)[0];
                    lines.forEach(this.push.bind(this));
                    done()
                };
                liner._flush = function (done) {
                    if (this._lastLineData) this.push(this._lastLineData);
                    this._lastLineData = null;
                    done();
                };
                file.pipe(liner);
                let i = 0;
                liner.on('readable', () => {
                    let line,
                        data = {};
                    while (line = liner.read()) {
                        let fields = line.trim().split(options.separator);
                        columns.forEach(val => {
                            let column = options.columns[val];
                            if (column.find) {
                                let index = firstLine.indexOf(column.find);
                                data[val] = fields[index];
                            }
                            if (column.defaultValue) {
                                data[val] = column.defaultValue;
                            }
                        });
                        result.push(data);
                        i ++;
                    }
                });
                liner.on('end', () => {
                    result.shift();
                    if (groupBy && 'string' === typeof groupBy) {
                        return deferred.resolve(_.groupBy(result, object => {
                            return object[groupBy];
                        }));
                    }
                    return deferred.resolve(result);
                });
            });
        return deferred.promise;
    }

    *makeQueryDummy(start, end, step) {
        while (start < end) {
            yield [start, '@dummy'];
            start += step;
        }
    }

    loadDataInfileString(file, cs, ss, options = {}) {
        options.separator = options.separator || this.options._separator;
        options = Object.assign(this.options, options);

        if (! options.table) throw new NotFoundError('No table selected');
        return (`
        LOAD DATA LOCAL INFILE
        "${file}"
        INTO TABLE
        \`${options.table}\`
        CHARACTER SET ${options.encoding || this.options.encoding}
        ${options.separator ? ' FIELDS TERMINATED BY \'' + options.separator + '\'' : ' '}
        ${options.enclosedBy ? ' ENCLOSED BY ' + options.enclosedBy : ' '  }
        ${options.ignoreLines ? ' IGNORE ' + options.ignoreLines + ' LINES ' : ' '}
        (${cs})` + (ss != '' ? ` SET ${ss}` : '')
        ).replace(/\s{2,}|\n|\r|\t/g, ' ').trim();
    }
}

 