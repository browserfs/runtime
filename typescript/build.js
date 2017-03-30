var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var Utils = (function () {
    function Utils() {
    }
    Utils.isArray = function (variable) {
        return variable && (variable instanceof Array);
    };
    Utils.isComplex = function (variable) {
        return variable && (typeof variable === 'object');
    };
    Utils.hasProperty = function (variable, propertyName) {
        return Utils.isComplex(variable) && variable.hasOwnProperty(propertyName);
    };
    Utils.getProperty = function (variable, propertyName) {
        if (Utils.hasProperty(variable, propertyName)) {
            return variable[propertyName];
        }
        else {
            return null;
        }
    };
    Utils.getKeys = function (variable) {
        if (!Utils.isComplex(variable)) {
            return [];
        }
        else {
            var result = [];
            if (Utils.isArray(variable)) {
                for (var i = 0, len = variable.length; i < len; i++) {
                    result.push(String(i));
                }
            }
            else {
                for (var key in variable) {
                    if (variable.hasOwnProperty(key)) {
                        result.push(key);
                    }
                }
            }
            return result;
        }
    };
    Utils.isString = function (variable) {
        return typeof variable === 'string';
    };
    Utils.isSet = function (variable) {
        return undefined !== variable;
    };
    Utils.isInt = function (variable) {
        return typeof variable === 'number' && isFinite(variable) && !isNaN(variable) && Math.round(variable) === variable;
    };
    Utils.arrayKeyExists = function (key, variable) {
        return Utils.isComplex(variable) && variable.hasOwnProperty(key);
    };
    Utils.arrayMerge = function (a, b) {
        var result = [];
        for (var i = 0, len = a.length; i < len; i++) {
            result.push(a[i]);
        }
        for (var i = 0, len = b.length; i < len; i++) {
            result.push(b[i]);
        }
        return result;
    };
    Utils.arrayValues = function (variable) {
        return Utils.isArray(variable)
            ? variable.slice(0)
            : [];
    };
    Utils.arrayUnique = function (variable) {
        if (!Utils.isArray(variable)) {
            return [];
        }
        var result = [], seen, j, i, len;
        for (i = 0, len = variable.length; i < len; i++) {
            seen = false;
            for (j = 0; j < i; j++) {
                if (variable[i] === variable[j]) {
                    seen = true;
                    break;
                }
            }
            if (!seen) {
                result.push(variable[i]);
            }
        }
        return result;
    };
    Utils.isFloat = function (mixed) {
        return typeof mixed === 'number' && isFinite(mixed) && !isNaN(mixed) && Math.round(mixed) !== mixed;
    };
    Utils.reverseString = function (str) {
        var result = '';
        for (var i = str.length - 1; i > -1; i--) {
            result = result + str.charAt(i);
        }
        return result;
    };
    return Utils;
}());
var StringParser = (function () {
    function StringParser(buffer) {
        this.parsed = '';
        this.remain = '';
        this.lineNum = 1;
        this.fileName = '<UNKNOWN>';
        this.remain = buffer;
    }
    StringParser.prototype.consume = function (numberOfBytes) {
        if (numberOfBytes < 0) {
            throw new Error('Invalid argument');
        }
        var chunk = this.remain.substr(0, numberOfBytes);
        var bytes = chunk.length;
        if (bytes === 0) {
            return;
        }
        for (var i = 0; i < bytes; i++) {
            if (chunk.charAt(i) === "\r") {
                if ((i + 1 < bytes) && (chunk.charAt(i + 1) == "\n")) {
                    i++;
                }
                this.lineNum++;
            }
            else if (chunk.charAt(i) == "\n") {
                this.lineNum++;
            }
        }
        this.parsed += chunk;
        this.remain = this.remain.substr(bytes);
    };
    StringParser.prototype.tell = function () {
        return this.parsed.length;
    };
    StringParser.prototype.available = function () {
        return this.remain.length;
    };
    StringParser.prototype.eof = function () {
        return this.remain === '';
    };
    StringParser.prototype.line = function () {
        return this.lineNum;
    };
    StringParser.prototype.file = function () {
        return this.fileName;
    };
    StringParser.prototype.setFileName = function (name) {
        if (name === void 0) { name = null; }
        this.fileName = name || '<UNKNOWN>';
    };
    StringParser.prototype.canReadString = function (str) {
        if (typeof str === "string") {
            return this.remain.substr(0, str.length) === str;
        }
        else {
            return false;
        }
    };
    StringParser.prototype.canReadExpression = function (str) {
        return str
            ? str.exec(this.remain)
            : null;
    };
    StringParser.prototype.toString = function () {
        return this.remain;
    };
    StringParser.prototype.nextToken = function () {
        if (this.eof()) {
            return 'END_OF_FILE';
        }
        else {
            var matches = void 0;
            if (matches = /^([\s]+)?([^\s]+)/.exec(this.remain)) {
                return matches[0];
            }
            else {
                return '';
            }
        }
    };
    return StringParser;
}());
var Runtime = (function () {
    function Runtime() {
        this.types = null;
        this.validators = null;
        this.types = {
            'int': new IntegerType(this, 'int'),
            'sint': new SIntType(this, 'sint'),
            'float': new DecimalType(this, 'float'),
            'sfloat': new SFloatType(this, 'sfloat'),
            'number': new NumberType(this, 'number'),
            'snumber': new SNumberType(this, 'snumber'),
            'boolean': new BooleanType(this, 'boolean'),
            'string': new VarcharType(this, 'string'),
            'any': new AnyType(this, 'any')
        };
        this.validators = {};
    }
    Runtime.prototype.addType = function (typeName, extendsType) {
        if (extendsType === void 0) { extendsType = null; }
        if (!this.isTypeName(typeName)) {
            throw new Error('Invalid type name `' + JSON.stringify(typeName) + '`. The type name must be a string');
        }
        if (this.isTypeRegistered(typeName)) {
            return this.types[typeName];
        }
        else {
            return this.types[typeName] = new Type(this, typeName, extendsType);
        }
    };
    Runtime.prototype.addValidator = function (validatorName, extendsValidator) {
        if (extendsValidator === void 0) { extendsValidator = null; }
        if (!this.isValidatorName(validatorName)) {
            throw new Error('Invalid validator name');
        }
        if (this.isValidatorRegistered(validatorName)) {
            return this.validators[validatorName];
        }
        else {
            return this.validators[validatorName] = new Validator(this, validatorName, extendsValidator);
        }
    };
    Runtime.prototype.isTypeName = function (typeName) {
        return Utils.isString(typeName) && typeName !== '' && /^[a-zA-Z_]([a-zA-Z0-9_]+)?(\[\])?$/.test(typeName)
            ? true
            : false;
    };
    Runtime.prototype.isValidatorName = function (validatorName) {
        return Utils.isString(validatorName) && validatorName !== '' && /^[a-zA-Z_]([a-zA-Z0-9_]+)?$/.test(validatorName)
            ? true
            : false;
    };
    Runtime.prototype.isTypeRegistered = function (typeName) {
        return Utils.isString(typeName) && Utils.arrayKeyExists(typeName, this.types);
    };
    Runtime.prototype.isValidatorRegistered = function (validatorName) {
        return Utils.isString(validatorName) && Utils.arrayKeyExists(validatorName, this.validators);
    };
    Runtime.prototype.isTypeOf = function (mixed, typeName, errors) {
        if (errors === void 0) { errors = null; }
        if (null !== errors) {
            errors.splice(0, errors.length);
        }
        if (this.isTypeName(typeName)) {
            var isArray = Utils.reverseString(typeName).substr(0, 2) == '][', result = void 0;
            if (isArray) {
                typeName = typeName.substr(0, typeName.length - 2);
            }
            if (this.isTypeRegistered(typeName)) {
                if (isArray) {
                    result = this.types[typeName].testArray(mixed, errors);
                    if (Utils.isArray(errors) && errors.length === 0) {
                        errors = null;
                    }
                    return result;
                }
                else {
                    result = this.types[typeName].test(mixed, errors);
                    if (Utils.isArray(errors) && errors.length === 0) {
                        errors = null;
                    }
                    return result;
                }
            }
            else {
                throw new Error('Type "' + typeName + '" is not declared');
            }
        }
        else {
            throw new Error('Argument typeName must be a valid type string name');
        }
    };
    /**
     * Returns true if an object validates by a registered validator, or false otherwise
     */
    Runtime.prototype.isValidatableBy = function (mixed, validatorName, errors) {
        if (errors === void 0) { errors = null; }
        if (null !== errors) {
            errors.splice(0, errors.length);
        }
        if (this.isValidatorName(validatorName)) {
            var result = void 0;
            if (this.isValidatorRegistered(validatorName)) {
                result = this.validators[validatorName].test(mixed, errors);
                if (Utils.isArray(errors) && errors.length === 0) {
                    errors = null;
                }
                return result;
            }
            else {
                throw new Error('Validator "' + validatorName + '" is not declared');
            }
        }
        else {
            throw new Error('Argument validatorName must be a valid validator string name');
        }
    };
    Runtime.prototype.typeToString = function (type) {
        if (Utils.isString(type)) {
            return type;
        }
        else if (Utils.isComplex(type)) {
            if (Utils.isString(type.type)) {
                return type.type;
            }
        }
        throw new Error('Invalid argument: string|IPropertyDefinition expected');
    };
    Runtime.prototype.toString = function () {
        var out = [];
        for (var name_1 in this.types) {
            if (this.types.hasOwnProperty(name_1)) {
                if (['string', 'int', 'float', 'boolean', 'number', 'any'].indexOf(name_1) === -1) {
                    out.push(name_1.toString());
                }
            }
        }
        for (var name_2 in this.validators) {
            if (this.validators.hasOwnProperty(name_2)) {
                out.push(name_2.toString());
            }
        }
        return out.join("\n\n");
    };
    Runtime.prototype.getType = function (typeName) {
        if (Utils.isString(typeName) && Utils.isSet(this.types[typeName])) {
            return this.types[typeName];
        }
        else {
            return null;
        }
    };
    Runtime.prototype.getValidator = function (validatorName) {
        if (Utils.isString(validatorName) && Utils.isSet(this.validators[validatorName])) {
            return this.validators[validatorName];
        }
        else {
            return null;
        }
    };
    Runtime.prototype.load = function (definitionFileBufferContents) {
        if (!Utils.isString(definitionFileBufferContents)) {
            throw new Error('Invalid argument definitionFileBufferContents. Must be string!');
        }
        if (definitionFileBufferContents === '') {
            throw new Error('Invalid argument definitionFileBufferContents. Must be non-empty!');
        }
        new RuntimeStringParser(definitionFileBufferContents, '<Buffer>', this);
        return this;
    };
    /**
     * Creates a new runtime from a list of ".types" files.
     *
     * @param buffer   - a list of ".types" files to load
     * @return Runtime
     * @throws Error
     */
    Runtime.createFromString = function (buffer) {
        var result = new Runtime();
        if (Utils.isString(buffer)) {
            result.load(buffer);
        }
        else {
            throw new Error('Failed to load definitions from string: ' + JSON.stringify(buffer));
        }
        return result;
    };
    return Runtime;
}());
var RuntimeStringParser = (function (_super) {
    __extends(RuntimeStringParser, _super);
    function RuntimeStringParser(buffer, fileName, runtime) {
        _super.call(this, buffer);
        this.runtime = null;
        this.setFileName(fileName);
        this.runtime = runtime;
        this.parse();
    }
    /**
     * If the reader can read token tokenName, consumes it's content and
     * returns true. Otherwise, returns false.
     */
    RuntimeStringParser.read = function (tokenName, reader) {
        if (!Utils.isString(tokenName)) {
            throw new Error('Invalid argument tokenName: expected string');
        }
        if (Utils.arrayKeyExists(tokenName, RuntimeStringParser.tokens)) {
            var consume = null;
            switch (tokenName) {
                case 'TOK_TYPE':
                    consume = 4;
                    break;
                case 'TOK_VALIDATOR':
                    consume = 9;
                    break;
                case 'TOK_EXTENDS':
                    consume = 7;
                default:
                    break;
            }
            var matches = reader.canReadExpression(RuntimeStringParser.tokens[tokenName]);
            if (matches) {
                reader.consume(consume === null ? matches[0].length : consume);
                return true;
            }
            else {
                return false;
            }
        }
        else {
            throw new Error('Unknown parser token name: ' + tokenName);
        }
    };
    /**
     * If the reader can read token tokenName, returns it's contents, otherwise
     * returns false.
     */
    RuntimeStringParser.readString = function (tokenName, reader) {
        if (!Utils.isString(tokenName)) {
            throw new Error('Invalid argument tokenName: expected string');
        }
        if (Utils.arrayKeyExists(tokenName, RuntimeStringParser.tokens)) {
            var matches = reader.canReadExpression(RuntimeStringParser.tokens[tokenName]);
            if (matches) {
                reader.consume(matches[0].length);
                return matches[0];
            }
            else {
                return false;
            }
        }
        else {
            throw new Error('Unknown parser token name: ' + tokenName);
        }
    };
    /**
     * Reads any successive white spaces or comments. Returns true if at least one whitespace
     * or one comment was read.
     */
    RuntimeStringParser.readWhiteSpaceOrComment = function (reader) {
        if (reader.eof()) {
            return false;
        }
        var matches = 0, result = false;
        do {
            result = false;
            if (RuntimeStringParser.read('WHITESPACE', reader)) {
                result = true;
                matches++;
                continue;
            }
            if (RuntimeStringParser.read('COMMENT', reader)) {
                result = true;
                matches++;
                continue;
            }
            if (reader.eof()) {
                result = true;
            }
        } while (result === true);
        return matches > 0;
    };
    /**
     * Reads a type property
     */
    RuntimeStringParser.readTypeProperty = function (reader, type, readSemiColon) {
        if (readSemiColon === void 0) { readSemiColon = true; }
        // optionally white space
        RuntimeStringParser.readWhiteSpaceOrComment(reader);
        var returnValue = {
            'isIndex': false,
            'indexType': false,
            'name': false,
            'optional': false,
            'type': false
        };
        if (RuntimeStringParser.read('TOK_SQBRACKET_BEGIN', reader)) {
            returnValue.indexType = RuntimeStringParser.readTypeProperty(reader, type, false);
            if (returnValue.optional) {
                throw new Error('Indexes cannot be optional, at line ' + reader.line() + ' in file ' + reader.file());
            }
            returnValue.isIndex = true;
            RuntimeStringParser.readWhiteSpaceOrComment(reader);
            if (!RuntimeStringParser.read('TOK_SQBRACKET_END', reader)) {
                throw new Error('Unexpected token ' + JSON.stringify(reader.nextToken()) + ', expected "]", at line ' + reader.line() + ' in file ' + reader.file());
            }
        }
        else {
            // propertyName
            returnValue.name = RuntimeStringParser.readString('TOK_VARIABLE_NAME', reader);
            if (returnValue.name === false) {
                throw new Error('Unexpected token ' + JSON.stringify(reader.nextToken()) + ', expected key name, at line ' + reader.line() + ' in file ' + reader.file());
            }
            returnValue['optional'] = RuntimeStringParser.read('TOK_QUESTION', reader);
            // optionally white space
            RuntimeStringParser.readWhiteSpaceOrComment(reader);
        }
        // read ':'
        if (!RuntimeStringParser.read('TOK_DOUBLEDOT', reader)) {
            throw new Error('Unexpected token ' + JSON.stringify(reader.nextToken()) + ', expected ":", at line ' + reader.line() + ' in file ' + reader.file());
        }
        // optionally white space
        RuntimeStringParser.readWhiteSpaceOrComment(reader);
        if (returnValue.type = RuntimeStringParser.readString('TOK_VARIABLE_NAME', reader)) {
            // test if array of
            if (RuntimeStringParser.read('TOK_SQBRACKET_BEGIN', reader)) {
                if (!RuntimeStringParser.read('TOK_SQBRACKET_END', reader)) {
                    throw new Error('Unexpected token ' + JSON.stringify(reader.nextToken()) + ', expected "]", at line ' + reader.line() + ' in file ' + reader.file());
                }
                returnValue.type = returnValue.type + '[]';
            }
        }
        else {
            throw new Error('Unexpected token ' + JSON.stringify(reader.nextToken()) + ', expected TYPE_DEF, at line ' + reader.line() + ' in file ' + reader.file());
        }
        // read optionally white space
        RuntimeStringParser.readWhiteSpaceOrComment(reader);
        if (readSemiColon) {
            if (!RuntimeStringParser.read('TOK_SEMICOLON', reader)) {
                throw new Error('Unexpected token ' + JSON.stringify(reader.nextToken()) + ', expected ";", at line ' + reader.line() + ' in file ' + reader.file());
            }
        }
        return returnValue;
    };
    RuntimeStringParser.prototype.parseType = function () {
        // we allready parsed the "type" token.
        if (!RuntimeStringParser.readWhiteSpaceOrComment(this)) {
            throw new Error('Unexpected token ' + JSON.stringify(this.nextToken()) + ' at line: ' + this.line() + ' in file ' + this.file());
        }
        var typeName = RuntimeStringParser.readString('TOK_VARIABLE_NAME', this);
        if (typeName === false) {
            throw new Error('Unexpected token ' + JSON.stringify(this.nextToken()) + ', expected type name, at line: ' + this.line() + ' in file ' + this.file());
        }
        var typeExtends = null;
        RuntimeStringParser.readWhiteSpaceOrComment(this);
        if (RuntimeStringParser.read('TOK_EXTENDS', this)) {
            RuntimeStringParser.readWhiteSpaceOrComment(this);
            typeExtends = RuntimeStringParser.readString('TOK_VARIABLE_NAME', this);
            if (typeExtends === false) {
                throw new Error('Unexpected token ' + JSON.stringify(this.nextToken()) + ', expected extended type name, at line: ' + this.line() + ' in file ' + this.file());
            }
        }
        var returnValue = this.runtime.addType(typeName, typeExtends);
        // optionally read a white space or comment
        RuntimeStringParser.readWhiteSpaceOrComment(this);
        if (!RuntimeStringParser.read('TOK_BLOCK_BEGIN', this)) {
            throw new Error('Unexpected token ' + JSON.stringify(this.nextToken()) + ', expected "{", at line: ' + this.line() + ' in file ' + this.file());
        }
        var property;
        do {
            RuntimeStringParser.readWhiteSpaceOrComment(this);
            if (this.canReadExpression(RuntimeStringParser.tokens['TOK_BLOCK_END'])) {
                break;
            }
            property = RuntimeStringParser.readTypeProperty(this, returnValue);
            if (property.isIndex) {
                returnValue.addIndex(property.indexType.type, {
                    'type': property.type,
                    'optional': property.optional
                });
            }
            else {
                returnValue.addProperty(property.name, {
                    'type': property.type,
                    'optional': property.optional
                });
            }
        } while (property);
        if (!RuntimeStringParser.read('TOK_BLOCK_END', this)) {
            throw new Error('Unexpected token ' + JSON.stringify(this.nextToken()) + ', expected "}", at line: ' + this.line() + ' in file ' + this.file() + ', buffer: ' + JSON.stringify(this.toString()));
        }
        return returnValue;
    };
    RuntimeStringParser.readInlineValue = function (reader) {
        // try read int
        var value = RuntimeStringParser.readString('TOK_NUMBER', reader), result;
        if (Utils.isString(value)) {
            return parseFloat(String(value));
        }
        // try read string
        value = RuntimeStringParser.readString('TOK_STRING', reader);
        if (Utils.isString(value)) {
            value = value.substr(1, value.length - 2);
            result = '';
            for (var i = 0, len = value.length; i < len; i++) {
                // handle "esc" char
                if (value[i] == '\\') {
                    if (i < len - 1) {
                        switch (value.charAt(i + 1)) {
                            case 'n':
                                result += "\n";
                                break;
                            case 'r':
                                result += "\r";
                                break;
                            case '\t':
                                result += "\t";
                                break;
                            default:
                                result += value.charAt(i + 1);
                                break;
                        }
                        i++;
                    }
                    else {
                        result += value.charAt(i);
                    }
                }
                else {
                    result += value.charAt(i);
                }
            }
            return result;
        }
        // try read boolean
        value = RuntimeStringParser.readString('TOK_BOOLEAN', reader);
        if (value !== false) {
            return value === 'true';
        }
        return null;
    };
    RuntimeStringParser.readEnumValues = function (reader, readAnyInsteadOfVar) {
        if (readAnyInsteadOfVar === void 0) { readAnyInsteadOfVar = false; }
        RuntimeStringParser.readWhiteSpaceOrComment(reader);
        if (!RuntimeStringParser.read('TOK_RBRACKET_BEGIN', reader)) {
            throw new Error('Unexpected token ' + reader.nextToken() + ', expected "(", at line ' + reader.line() + ' in file ' + reader.file());
        }
        var result = [], next, item;
        do {
            next = false;
            RuntimeStringParser.readWhiteSpaceOrComment(reader);
            if (readAnyInsteadOfVar) {
                item = RuntimeStringParser.readInlineValue(reader);
            }
            else {
                item = RuntimeStringParser.readString('TOK_VARIABLE_NAME', reader);
            }
            if (item) {
                result.push(item);
                RuntimeStringParser.readWhiteSpaceOrComment(reader);
                if (RuntimeStringParser.read('TOK_COMMA', reader)) {
                    next = true;
                }
            }
        } while (next);
        RuntimeStringParser.readWhiteSpaceOrComment(reader);
        if (!RuntimeStringParser.read('TOK_RBRACKET_END', reader)) {
            throw new Error('Unexpected token ' + reader.nextToken() + ', expected ")", at line ' + reader.line() + ' in file ' + reader.file());
        }
        return result;
    };
    RuntimeStringParser.getValidatorPropertyRules = function (reader, endOfEnumerationToken) {
        if (endOfEnumerationToken === void 0) { endOfEnumerationToken = 'TOK_SEMICOLON'; }
        var rules = [], operator, value, error, readNext;
        do {
            operator = RuntimeStringParser.readString('TOK_VALIDATOR_PROPERTY', reader);
            if (operator === false) {
                throw new Error('Unexpected token ' + reader.nextToken() + ', expected validator operator, on line ' + reader.line() + ' in file ' + reader.file());
            }
            operator = operator.substr(1);
            // optionally white space or comment
            RuntimeStringParser.readWhiteSpaceOrComment(reader);
            switch (operator) {
                case 'index':
                    value = null;
                    if (!RuntimeStringParser.read('TOK_SQBRACKET_BEGIN', reader)) {
                        throw new Error('Unexpected token ' + reader.nextToken() + ', expected "[", on line ' + reader.line() + ' in file ' + reader.file());
                    }
                    // optional white space
                    RuntimeStringParser.readWhiteSpaceOrComment(reader);
                    value = RuntimeStringParser.getValidatorPropertyRules(reader, 'TOK_SQBRACKET_END');
                    break;
                case 'instanceof':
                    value = RuntimeStringParser.readString('TOK_VARIABLE_NAME', reader);
                    break;
                case 'oneof':
                    value = RuntimeStringParser.readEnumValues(reader);
                    break;
                case 'require':
                    // if we can read a "(", means we're intending to use multiple requirements.
                    // otherwise we're reading a single require
                    if (reader.canReadString('(')) {
                        value = RuntimeStringParser.readEnumValues(reader);
                    }
                    else {
                        value = RuntimeStringParser.readString('TOK_VARIABLE_NAME', reader);
                        if (null === value) {
                            throw new Error('Unexpected token ' + JSON.stringify(reader.nextToken()) + ', expected validator name or list of validators, on line ' + reader.line() + ' in file ' + reader.file());
                        }
                    }
                    break;
                case 'in':
                case 'nin':
                    if (reader.canReadString('(')) {
                        value = RuntimeStringParser.readEnumValues(reader, true);
                    }
                    else {
                        throw new Error('Unexpected token ' + JSON.stringify(reader.nextToken()) + ', expected "(", on line ' + reader.line() + ' in file ' + reader.file());
                    }
                    break;
                default:
                    value = RuntimeStringParser.readInlineValue(reader);
                    break;
            }
            if (value === null) {
                throw new Error('Unexpected token ' + reader.nextToken() + ', expected <value>, at line ' + reader.line() + ' in file ' + reader.file());
            }
            // optionally white space or comment
            RuntimeStringParser.readWhiteSpaceOrComment(reader);
            if (RuntimeStringParser.read('TOK_VALIDATOR_PTR', reader)) {
                // optionally white space or comment
                RuntimeStringParser.readWhiteSpaceOrComment(reader);
                // followed by optionally error
                error = RuntimeStringParser.readInlineValue(reader);
                if (error !== null) {
                    RuntimeStringParser.readWhiteSpaceOrComment(reader);
                }
            }
            else {
                error = null;
            }
            readNext = RuntimeStringParser.read('TOK_COMMA', reader);
            if (false === readNext) {
                // is followed by end of instruction?
                if (false === RuntimeStringParser.read(endOfEnumerationToken, reader)) {
                    throw new Error('Unexpected token ' + reader.nextToken() + ', expected <' + endOfEnumerationToken + '> or ",", at line ' + reader.line() + ' in file ' + reader.file());
                }
                else {
                    RuntimeStringParser.readWhiteSpaceOrComment(reader);
                }
            }
            if (reader.eof()) {
                throw new Error('Unexpected end of buffer, @ line ' + reader.line() + ' in file ' + reader.file());
            }
            rules.push({
                'operator': operator,
                'value': value,
                'error': error
            });
            if (readNext) {
                RuntimeStringParser.readWhiteSpaceOrComment(reader);
            }
        } while (readNext);
        return rules;
    };
    /**
     * Reads a type property
     */
    RuntimeStringParser.readValidatorProperty = function (reader, validator) {
        var rules, rule, propertyName;
        // optionally white space
        RuntimeStringParser.readWhiteSpaceOrComment(reader);
        if (reader.canReadString('@')) {
            rules = RuntimeStringParser.getValidatorPropertyRules(reader);
            try {
                for (var ruleName in rules) {
                    if (!rules.hasOwnProperty(rule)) {
                        continue;
                    }
                    rule = rules[ruleName];
                    validator.addRootCondition(rule.operator, rule.value, rule.error);
                }
            }
            catch (e) {
                throw new Error('Parser error, at line ' + reader.line() + ' in file ' + reader.file() + ': ' + e.getMessage());
            }
        }
        else {
            // read property name
            propertyName = RuntimeStringParser.readString('TOK_VARIABLE_NAME', reader);
            if (propertyName === false) {
                throw new Error('Unexpected token ' + reader.nextToken() + ', expected <operator> or <property>, at line ' + reader.line() + ' in file ' + reader.file());
            }
            // read optionally white space or comment
            RuntimeStringParser.readWhiteSpaceOrComment(reader);
            if (!RuntimeStringParser.read('TOK_DOUBLEDOT', reader)) {
                throw new Error('Unexpected token ' + reader.nextToken() + ', expected ":", at line ' + reader.line() + ' in file ' + reader.file());
            }
            RuntimeStringParser.readWhiteSpaceOrComment(reader);
            rules = RuntimeStringParser.getValidatorPropertyRules(reader);
            try {
                for (var ruleName in rules) {
                    if (!rules.hasOwnProperty(rule)) {
                        continue;
                    }
                    rule = rules[ruleName];
                    validator.addPropertyCondition(propertyName, rule.operator, rule.value, rule.error);
                }
            }
            catch (e) {
                throw new Error('Parser error, at line ' + reader.line() + ' in file ' + reader.file() + ': ' + e.getMessage());
            }
        }
        return validator;
    };
    RuntimeStringParser.prototype.parseValidator = function () {
        if (!RuntimeStringParser.readWhiteSpaceOrComment(this)) {
            throw new Error('Unexpected token ' + JSON.stringify(this.nextToken()) + ' at line: ' + this.line() + ' in file ' + this.file());
        }
        var validatorName, validatorExtends, returnValue, rule;
        validatorName = RuntimeStringParser.readString('TOK_VARIABLE_NAME', this);
        validatorExtends = null;
        RuntimeStringParser.readWhiteSpaceOrComment(this);
        if (RuntimeStringParser.read('TOK_EXTENDS', this)) {
            RuntimeStringParser.readWhiteSpaceOrComment(this);
            validatorExtends = RuntimeStringParser.readString('TOK_VARIABLE_NAME', this);
            if (validatorExtends === false) {
                throw new Error('Unexpected token ' + JSON.stringify(this.nextToken()) + ', expected extended validator name, at line: ' + this.line() + ' in file ' + this.file());
            }
        }
        returnValue = this.runtime.addValidator(validatorName, validatorExtends);
        // optionally read a white space or comment
        RuntimeStringParser.readWhiteSpaceOrComment(this);
        if (!RuntimeStringParser.read('TOK_BLOCK_BEGIN', this)) {
            throw new Error('Unexpected token ' + JSON.stringify(this.nextToken()) + ', expected "{", at line: ' + this.line() + ' in file ' + this.file());
        }
        do {
            RuntimeStringParser.readWhiteSpaceOrComment(this);
            if (this.canReadExpression(RuntimeStringParser.tokens['TOK_BLOCK_END'])) {
                break;
            }
            rule = RuntimeStringParser.readValidatorProperty(this, returnValue);
        } while (rule);
        if (!RuntimeStringParser.read('TOK_BLOCK_END', this)) {
            throw new Error('Unexpected token ' + JSON.stringify(this.nextToken()) + ', expected "}", at line: ' + this.line() + ' in file ' + this.file() + ', buffer: ' + JSON.stringify(this.toString()));
        }
        return returnValue;
    };
    RuntimeStringParser.prototype.parse = function () {
        var $result;
        while (!this.eof()) {
            switch (true) {
                case RuntimeStringParser.read('WHITESPACE', this):
                case RuntimeStringParser.read('COMMENT', this):
                    break;
                case RuntimeStringParser.read('TOK_TYPE', this):
                    $result = this.parseType();
                    break;
                case RuntimeStringParser.read('TOK_VALIDATOR', this):
                    $result = this.parseValidator();
                    break;
                default:
                    throw new Error("Unknown token " + JSON.stringify(this.nextToken()) + ' at line: ' + this.line() + ' in file ' + this.file());
            }
        }
    };
    RuntimeStringParser.tokens = {
        'WHITESPACE': /^([\s]+)/,
        'COMMENT': /^(\/\/[^\n\r]+|\/\*[\s\S\r\n]+?\*\/)/,
        'TOK_TYPE': /^type(\s|\/)/,
        'TOK_VALIDATOR': /^validator(\s|\/)/,
        'TOK_EXTENDS': /^extends(\s|\/)/,
        'TOK_VARIABLE_NAME': /^[a-zA-Z_]([a-zA-Z0-9_]+)?/,
        'TOK_BLOCK_BEGIN': /^\{/,
        'TOK_BLOCK_END': /^\}/,
        'TOK_SQBRACKET_BEGIN': /^\[/,
        'TOK_SQBRACKET_END': /^\]/,
        'TOK_RBRACKET_BEGIN': /^\(/,
        'TOK_RBRACKET_END': /^\)/,
        'TOK_QUESTION': /^\?/,
        'TOK_DOUBLEDOT': /^\:/,
        'TOK_SEMICOLON': /^;/,
        'TOK_VALIDATOR_PROPERTY': /^@[a-zA-Z_]([a-zA-Z0-9_]+)?/,
        'TOK_VALIDATOR_PTR': /^=>/,
        'TOK_NUMBER': /^(\-)?[\d]+(\.[\d]+)?/,
        'TOK_STRING': /^("(?:[^"\\\\]|\\\\.)*"|\'(?:[^\'\\\\]|\\\\.)*\')/,
        'TOK_BOOLEAN': /^(true|false)/,
        'TOK_NULL': /^null/,
        'TOK_COMMA': /^,/
    };
    return RuntimeStringParser;
}(StringParser));
var Type = (function () {
    function Type(runtime, typeName, extendsType) {
        if (extendsType === void 0) { extendsType = null; }
        this._extends = null;
        this.properties = null;
        this.index = null;
        this.runtime = runtime;
        this.name = typeName;
        if (extendsType !== null) {
            if (typeof extendsType !== "string") {
                throw new Error('extendsType argument must be string|null');
            }
            this._extends = extendsType;
        }
    }
    /**
     * Test if @param $mixed matches this type
     */
    Type.prototype.test = function (mixed, errors) {
        if (errors === void 0) { errors = null; }
        var includeErrors = Utils.isArray(errors);
        if (Utils.isComplex(mixed)) {
            if (includeErrors) {
                errors.push('array | object expected');
            }
            return false;
        }
        var props = this.getRequiredProperties(), needsImplementation, k, v, type;
        for (var i = 0, len = props.length; i < len; i++) {
            needsImplementation = props[i];
            if (!Utils.hasProperty(mixed, needsImplementation)) {
                if (includeErrors) {
                    errors.push('object ' + JSON.stringify(mixed) + ' does not implement a property called ' + JSON.stringify(needsImplementation));
                }
                return false;
            }
        }
        for (var i = 0, keys = Utils.getKeys(mixed), len = keys.length; i < len; i++) {
            k = keys[i];
            v = Utils.getProperty(mixed, k);
            if (!(type = this.getPropertyType(k))) {
                if (includeErrors) {
                    errors.push('property ' + JSON.stringify(k) + ' is not implemented in type "' + this.name + '"');
                }
                return false;
            }
            else {
                if (!this.runtime.isTypeOf(v, type)) {
                    if (includeErrors) {
                        errors.push('property ' + JSON.stringify(k) + ' must be of type ' + JSON.stringify(type));
                    }
                    return false;
                }
            }
        }
        return true;
    };
    /**
     * Test if @param $mixed matches an array with all elements of this type
     */
    Type.prototype.testArray = function (mixed, errors) {
        if (errors === void 0) { errors = null; }
        var includeErrors = Utils.isArray(errors);
        if (!Utils.isComplex(mixed)) {
            if (includeErrors) {
                errors.push('array | object expected');
            }
            return false;
        }
        var keys;
        for (var i = 0, len = (keys = Utils.getKeys(mixed)).length; i < len; i++) {
            if (keys.indexOf(String(i)) === -1) {
                if (includeErrors) {
                    errors.push('array | complex type expected');
                }
                return false;
            }
            if (!this.test(Utils.getProperty(mixed, String(i)), errors)) {
                if (includeErrors) {
                    errors.push('index #' + String(i) + ' is not a ' + this.name);
                }
                return false;
            }
        }
        return true;
    };
    /**
     * Adds a property to this type
     */
    Type.prototype.addProperty = function (propertyName, propertyType) {
        if (null === this.properties) {
            this.properties = {};
        }
        if (!Utils.isString(propertyName) || propertyName === '') {
            throw new Error('Invalid argument: propertyName must be of type string!');
        }
        if (!Utils.isArray(propertyType)) {
            throw new Error('Invalid argument: propertyType must be of type array!');
        }
        if (Utils.isSet(this.properties[propertyName])) {
            throw new Error('Duplicate property "' + propertyName + '" in interface "' + this.name + '"');
        }
        this.properties[propertyName] = propertyType;
    };
    /**
     * Enforces the properties of this interface to match an indexed pattern.
     */
    Type.prototype.addIndex = function (indexNameType, indexValueType) {
        if (null !== this.index) {
            throw new Error('Interface "' + this.name + '" already has a assigned index');
        }
        if (!Utils.isString(indexNameType) || indexNameType === '') {
            throw new Error('Invalid argument ( indexNameType )');
        }
        if (indexNameType != 'int' && indexNameType != 'number' && indexNameType != 'string') {
            throw new Error('Invalid index name type. Index names can be of type int|number|string');
        }
        if (!Utils.isArray(indexValueType)) {
            throw new Error('Invalid argument: indexValueType must be of type array!');
        }
        this.index = {
            'keyType': indexNameType,
            'valueType': indexValueType
        };
    };
    /**
     * Converts the type ( interface ) to string.
     */
    Type.prototype.toString = function () {
        if (null === this.index && null === this.properties) {
            return this.name;
        }
        else {
            var result = 'interface ' + this.name + (null === this._extends ? '' : ' extends ' + this._extends) + ' {', out = [], propertyType = void 0;
            if (this.index !== null) {
                out.push('    [ index: ' + this.index['keyType'] + ' ]: ' + this.runtime.typeToString(this.index['valueType']));
            }
            if (this.properties !== null) {
                for (var propertyName in this.properties) {
                    if (this.properties.hasOwnProperty(propertyName)) {
                        propertyType = this.properties[propertyName];
                        out.push('    ' + propertyName + (propertyType['optional'] ? '?' : '') + ': ' + this.runtime.typeToString(propertyType));
                    }
                }
            }
            if (out.length) {
                result = result + "\n" + out.join(";\n") + ";\n";
            }
            result = result + '}';
            return result;
        }
    };
    /**
     * Test if a property is valid inside an interface
     */
    Type.prototype.validPropertyKey = function (propertyName) {
        // non-object interface, native type
        if (null === this.properties && null === this.index) {
            return false;
        }
        // a property name must be either string, or number
        if (!Utils.isString(propertyName) && !Utils.isInt(propertyName)) {
            return false;
        }
        // a property name cannot be empty!
        if (Utils.isString(propertyName) && propertyName === '') {
            return false;
        }
        // test to see if a property exists
        if (this.properties !== null) {
            if (Utils.arrayKeyExists(propertyName, this.properties)) {
                return true;
            }
        }
        // test to see if this object has an index
        if (this.index !== null) {
            if (this.runtime.isTypeOf(propertyName, this.index.keyType)) {
                return true;
            }
        }
        // test to see if this object extends an interface, and the key is valid in that interface
        if (this._extends !== null) {
            var _extendsType = this.runtime.getType(this._extends);
            if (_extendsType) {
                return _extendsType.validPropertyKey(propertyName);
            }
        }
        return false;
    };
    /**
     * Returns the type of the property @propertyName inside this interface
     */
    Type.prototype.getPropertyType = function (propertyName) {
        // non-object interface, native type
        if (null === this.properties && null === this.index) {
            return false;
        }
        // a property name must be either string, or number
        if (!Utils.isString(propertyName) && !Utils.isInt(propertyName)) {
            return false;
        }
        // a property name cannot be empty!
        if (Utils.isString(propertyName) && '' === propertyName) {
            return false;
        }
        // test to see if a property exists
        if (this.properties !== null) {
            if (Utils.arrayKeyExists(propertyName, this.properties)) {
                return this.properties[propertyName].type;
            }
        }
        // test to see if this object has an index
        if (null !== this.index) {
            if (this.runtime.isTypeOf(propertyName, this.index.keyType)) {
                return this.index.valueType.type;
            }
        }
        // test to see if this object extends an interface, and the key is valid in that interface
        if (this._extends !== null) {
            var _extends = this.runtime.getType(this._extends);
            if (_extends) {
                return _extends.getPropertyType(propertyName);
            }
        }
        return false;
    };
    /**
     * Returns the list with all the required properties of an interface (optional ones are excluded from this list)
     */
    Type.prototype.getRequiredProperties = function () {
        var result = [];
        if (this.properties !== null) {
            for (var propertyName in this.properties) {
                if (this.properties.propertyIsEnumerable(propertyName)) {
                    if (this.properties[propertyName].optional === false) {
                        result.push(propertyName);
                    }
                }
            }
        }
        else {
            result = [];
        }
        if (null !== this._extends) {
            var _extends = this.runtime.getType(this._extends);
            if (_extends) {
                result = Utils.arrayMerge(result, _extends.getRequiredProperties());
            }
        }
        return Utils.arrayValues(Utils.arrayUnique(result));
    };
    return Type;
}());
var Validator = (function () {
    function Validator(runtime, validatorName, extendsValidator) {
        if (extendsValidator === void 0) { extendsValidator = null; }
        this.runtime = null;
        this.name = null;
        this._extends = null;
        this.extended = false;
        this.rootRules = null;
        this.propertyRules = null;
        this.lastTestedValue = null;
        this.runtime = runtime;
        this.name = validatorName;
        if (null === extendsValidator || Utils.isString(extendsValidator)) {
            this._extends = extendsValidator;
        }
        else {
            throw new Error('Invalid argument: extendsValidator: null|string expected!');
        }
    }
    /**
     * Root conditions are used for primitive data types.
     */
    Validator.prototype.addRootCondition = function (operator, value, error) {
        if (error === void 0) { error = null; }
        throw new Error('Validator::addRootCondition (and some more methods) are not ported to javascript version!');
    };
    /**
     * Property conditions are used for complex data types.
     */
    Validator.prototype.addPropertyCondition = function (propertyName, operator, value, error) {
        if (error === void 0) { error = null; }
        throw new Error('Validator::addPropertyCondition (and some more methods) are not ported to javascript version!');
    };
    Validator.prototype.test = function (mixed, errors) {
        if (errors === void 0) { errors = null; }
        throw new Error('Validator::test (and some more methods) are not ported to javascript version');
    };
    return Validator;
}());
var IntegerType = (function (_super) {
    __extends(IntegerType, _super);
    function IntegerType() {
        _super.apply(this, arguments);
    }
    IntegerType.prototype.test = function (mixed, errors) {
        if (errors === void 0) { errors = null; }
        return Utils.isInt(mixed);
    };
    return IntegerType;
}(Type));
var AnyType = (function (_super) {
    __extends(AnyType, _super);
    function AnyType() {
        _super.apply(this, arguments);
    }
    AnyType.prototype.test = function (mixed, errors) {
        if (errors === void 0) { errors = null; }
        return undefined !== mixed;
    };
    return AnyType;
}(Type));
var SIntType = (function (_super) {
    __extends(SIntType, _super);
    function SIntType() {
        _super.apply(this, arguments);
    }
    SIntType.prototype.test = function (mixed, errors) {
        if (errors === void 0) { errors = null; }
        if (Utils.isString(mixed)) {
            return /^(0|(\-)?[1-9]([0-9]+)?)$/.test(mixed);
        }
        else {
            return false;
        }
    };
    return SIntType;
}(Type));
var DecimalType = (function (_super) {
    __extends(DecimalType, _super);
    function DecimalType() {
        _super.apply(this, arguments);
    }
    DecimalType.prototype.test = function (mixed, errors) {
        if (errors === void 0) { errors = null; }
        return Utils.isFloat(mixed);
    };
    return DecimalType;
}(Type));
var SFloatType = (function (_super) {
    __extends(SFloatType, _super);
    function SFloatType() {
        _super.apply(this, arguments);
    }
    SFloatType.prototype.test = function (mixed, errors) {
        if (errors === void 0) { errors = null; }
        if (typeof mixed === 'string') {
            return /^(0|(\-)?[1-9]([0-9]+)?)\.[0-9]+$/.test(mixed);
        }
        else {
            return false;
        }
    };
    return SFloatType;
}(Type));
var NumberType = (function (_super) {
    __extends(NumberType, _super);
    function NumberType() {
        _super.apply(this, arguments);
    }
    NumberType.prototype.test = function (mixed, errors) {
        return typeof mixed === 'number' && isFinite(mixed);
    };
    return NumberType;
}(Type));
var SNumberType = (function (_super) {
    __extends(SNumberType, _super);
    function SNumberType() {
        _super.apply(this, arguments);
    }
    SNumberType.prototype.test = function (mixed, errors) {
        if (errors === void 0) { errors = null; }
        if (typeof mixed === 'string') {
            return /^(0|(\-)?[1-9]([0-9]+)?)(\.[0-9]+)?$/.test(mixed);
        }
        else {
            return false;
        }
    };
    return SNumberType;
}(Type));
var BooleanType = (function (_super) {
    __extends(BooleanType, _super);
    function BooleanType() {
        _super.apply(this, arguments);
    }
    BooleanType.prototype.test = function (mixed, errors) {
        if (errors === void 0) { errors = null; }
        return true === mixed || false === mixed;
    };
    return BooleanType;
}(Type));
var VarcharType = (function (_super) {
    __extends(VarcharType, _super);
    function VarcharType() {
        _super.apply(this, arguments);
    }
    VarcharType.prototype.test = function (mixed, errors) {
        if (errors === void 0) { errors = null; }
        return typeof mixed === 'string';
    };
    return VarcharType;
}(Type));
///<reference path="./interfaces.ts" />
///<reference path="./Utils.ts" />
///<reference path="./StringParser.ts" />
///<reference path="./Runtime.ts" />
///<reference path="./String/RuntimeStringParser.ts" />
///<reference path="./Type.ts" />
///<reference path="./Validator.ts" />
///<reference path="./Type/IntegerType.ts" />
///<reference path="./Type/AnyType.ts" />
///<reference path="./Type/SIntType.ts" />
///<reference path="./Type/DecimalType.ts" />
///<reference path="./Type/SFloatType.ts" />
///<reference path="./Type/NumberType.ts" />
///<reference path="./Type/SNumberType.ts" />
///<reference path="./Type/BooleanType.ts" />
///<reference path="./Type/VarcharType.ts" /> 
