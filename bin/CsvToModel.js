/************************************************************************
 *  PROJECT: csv-parse-model
 *  CREATED ON: 08.10.15 16:51
 *  AUTHOR: Michael
 ************************************************************************/
'use strict';

Object.defineProperty(exports, '__esModule', {
    value: true
});

var _slicedToArray = (function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i['return']) _i['return'](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError('Invalid attempt to destructure non-iterable instance'); } }; })();

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

var _bluebird = require('bluebird');

var _bluebird2 = _interopRequireDefault(_bluebird);

var _lodash = require('lodash');

var _lodash2 = _interopRequireDefault(_lodash);

var _fs2 = require('fs');

var _fs3 = _interopRequireDefault(_fs2);

var _ExceptionsExceptionsMain = require('./../Exceptions/ExceptionsMain');

var _stream = require('stream');

var _stream2 = _interopRequireDefault(_stream);

var fs = _bluebird2['default'].promisifyAll(_fs3['default']);

var liner = new _stream2['default'].Transform({ objectMode: true });

var Csv2Model = (function () {
    function Csv2Model() {
        var options = arguments.length <= 0 || arguments[0] === undefined ? {} : arguments[0];

        _classCallCheck(this, Csv2Model);

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

    _createClass(Csv2Model, [{
        key: 'parse',
        value: function parse() {
            var _this = this;

            var obj = arguments.length <= 0 || arguments[0] === undefined ? {} : arguments[0];

            return _bluebird2['default'].resolve(this.options.firstLine.split(obj.separator || this.options.separator).map(function (val) {
                return val.trim();
            })).then(function (firstLine) {
                var result = new Map(),
                    length = firstLine.length,
                    insertMap = new Map(),
                    setSet = new Set();
                obj.columns = obj.columns || _this.options.columns;
                Object.keys(obj.columns).filter(function (key) {
                    return obj.columns[key].find || obj.columns[key].defaultValue;
                }).forEach(function (val) {
                    var options = obj.columns[val];
                    options.name = val;
                    options.shouldVariable = '';
                    if (options.find && ! ~firstLine.indexOf(options.find) && options.alias instanceof Array) {
                        var x = 0;
                        options.find = options.alias.some(function (alias, i) {
                            x = i;
                            return ~firstLine.indexOf(alias);
                        }) ? options.alias[x] : false;
                        // if nothing is found in find and alias, throw
                        if (!options.find) {
                            throw new _ExceptionsExceptionsMain.NotFoundError(val + ' has no finder');
                        }
                    }
                    if (~firstLine.indexOf(options.find)) {
                        options.indexes = firstLine.indexOf(options.find);
                        options.shouldVariable = options.valueOptions ? '@' : '';
                        if (options.valueOptions) {
                            setSet.add(options.shouldVariable + val);
                        }
                        insertMap.set(options.indexes, options.shouldVariable + val);
                    } else {
                        if (!options.find) {
                            if (!options.defaultValue) throw new _ExceptionsExceptionsMain.NotFoundError('No index found for ' + options.find);
                            options.addSet = val;
                            setSet.add(options.shouldVariable + val);
                        }
                    }

                    result.set(options.shouldVariable + val, options);
                });
                return [result, insertMap, setSet, length];
            }).spread(function (res, inserts, sets, length) {
                var insertsMap = new Map(),
                    columnsString = undefined,
                    setsString = '';
                var _iteratorNormalCompletion = true;
                var _didIteratorError = false;
                var _iteratorError = undefined;

                try {
                    for (var _iterator = _this.makeQueryDummy(0, length, 1)[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
                        var _step$value = _slicedToArray(_step.value, 2);

                        var i = _step$value[0];
                        var field = _step$value[1];

                        insertsMap.set(i, inserts.has(i) ? inserts.get(i) : field);
                    }
                } catch (err) {
                    _didIteratorError = true;
                    _iteratorError = err;
                } finally {
                    try {
                        if (!_iteratorNormalCompletion && _iterator['return']) {
                            _iterator['return']();
                        }
                    } finally {
                        if (_didIteratorError) {
                            throw _iteratorError;
                        }
                    }
                }

                columnsString = Array.from(insertsMap.values()).toString().replace(/(,@dummy)+$/, '');

                var _iteratorNormalCompletion2 = true;
                var _didIteratorError2 = false;
                var _iteratorError2 = undefined;

                try {
                    for (var _iterator2 = sets.keys()[Symbol.iterator](), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
                        var key = _step2.value;

                        setsString += key.replace('@', '') + '=' + (res.get(key).defaultValue ? '"' + (res.get(key).defaultValue + '", ') : (Object.keys(res.get(key).valueOptions)[0] + '(' + res.get(key).valueOptions[Object.keys(res.get(key).valueOptions)[0]]).replace(/(:\w+)/, key) + '), ');
                    }
                } catch (err) {
                    _didIteratorError2 = true;
                    _iteratorError2 = err;
                } finally {
                    try {
                        if (!_iteratorNormalCompletion2 && _iterator2['return']) {
                            _iterator2['return']();
                        }
                    } finally {
                        if (_didIteratorError2) {
                            throw _iteratorError2;
                        }
                    }
                }

                setsString = setsString.replace(/(, )+$/, '');
                if (!obj.createLoadString) {
                    return [columnsString, setsString];
                }
                obj = Object.assign(obj, _this.options);
                return _this.loadDataInfileString(obj.file, columnsString, setsString, obj);
            });
            /* .catch(NotFoundError, err => log(err))
             .catch(ModelNotFoundError, err => log(err))
             .catch(NoInputFile, err => log(err))
             .catch(Error, err => log(err))*/
        }
    }, {
        key: 'read',
        value: function read() {
            var groupBy = arguments.length <= 0 || arguments[0] === undefined ? false : arguments[0];
            var options = arguments.length <= 1 || arguments[1] === undefined ? {} : arguments[1];

            options = Object.assign({
                separator: this.options.separator,
                lineEnding: this.options.lineEnding,
                enclosedBy: this.options.enclosedBy,
                encoding: this.options.encoding,
                ignoreLines: this.options.ignoreLines,
                file: this.file,
                columns: this.options.columns
            }, options);
            var deferred = _bluebird2['default'].pending();
            _bluebird2['default'].all([fs.createReadStream(options.file, options.encoding), this.options.firstLine.split(options.separator).map(function (val) {
                return val.trim();
            }), Object.keys(options.columns).filter(function (val) {
                return options.columns[val].find || options.columns[val].defaultValue;
            })]).spread(function (file, firstLine, columns) {
                var result = [];
                liner._transform = function (chunk, encoding, done) {
                    var data = chunk.toString();
                    if (this._lastLineData) data = this._lastLineData + data;
                    var lines = data.split(options.lineEnding);
                    this._lastLineData = lines.splice(lines.length - 1, 1)[0];
                    lines.forEach(this.push.bind(this));
                    done();
                };
                liner._flush = function (done) {
                    if (this._lastLineData) this.push(this._lastLineData);
                    this._lastLineData = null;
                    done();
                };
                file.pipe(liner);
                var i = 0;
                liner.on('readable', function () {
                    var line = undefined,
                        data = {};

                    var _loop = function () {
                        var fields = line.trim().split(options.separator);
                        columns.forEach(function (val) {
                            var column = options.columns[val];
                            if (column.find) {
                                var index = firstLine.indexOf(column.find);
                                data[val] = fields[index];
                            }
                            if (column.defaultValue) {
                                data[val] = column.defaultValue;
                            }
                        });
                        result.push(data);
                        i++;
                    };

                    while (line = liner.read()) {
                        _loop();
                    }
                });
                liner.on('end', function () {
                    result.shift();
                    if (groupBy && 'string' === typeof groupBy) {
                        return deferred.resolve(_lodash2['default'].groupBy(result, function (object) {
                            return object[groupBy];
                        }));
                    }
                    return deferred.resolve(result);
                });
            });
            return deferred.promise;
        }
    }, {
        key: 'makeQueryDummy',
        value: function* makeQueryDummy(start, end, step) {
            while (start < end) {
                yield [start, '@dummy'];
                start += step;
            }
        }
    }, {
        key: 'loadDataInfileString',
        value: function loadDataInfileString(file, cs, ss) {
            var options = arguments.length <= 3 || arguments[3] === undefined ? {} : arguments[3];

            options.separator = options.separator || this.options._separator;
            options = Object.assign(this.options, options);

            if (!options.table) throw new _ExceptionsExceptionsMain.NotFoundError('No table selected');
            return ('\n        LOAD DATA LOCAL INFILE\n        "' + file + '"\n        INTO TABLE\n        `' + options.table + '`\n        CHARACTER SET ' + (options.encoding || this.options.encoding) + '\n        ' + (options.separator ? ' FIELDS TERMINATED BY \'' + options.separator + '\'' : ' ') + '\n        ' + (options.enclosedBy ? ' ENCLOSED BY ' + options.enclosedBy : ' ') + '\n        ' + (options.ignoreLines ? ' IGNORE ' + options.ignoreLines + ' LINES ' : ' ') + '\n        (' + cs + ')' + (ss != '' ? ' SET ' + ss : '')).replace(/\s{2,}|\n|\r|\t/g, ' ').trim();
        }
    }]);

    return Csv2Model;
})();

exports['default'] = Csv2Model;
module.exports = exports['default'];

//# sourceMappingURL=CsvToModel.js.map