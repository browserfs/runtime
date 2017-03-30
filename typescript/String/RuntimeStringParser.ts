class RuntimeStringParser extends StringParser {

    protected static tokens = {
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
        'TOK_COMMA': /^,/,
    };


    protected runtime: Runtime = null;

    constructor(buffer: string, fileName: string, runtime: Runtime) {

        super(buffer);

        this.setFileName(fileName);

        this.runtime = runtime;

        this.parse();
    }

    /**
     * If the reader can read token tokenName, consumes it's content and
     * returns true. Otherwise, returns false.
     */
    protected static read(tokenName, reader: StringParser) {

        if (!Utils.isString(tokenName)) {
            throw new Error('Invalid argument tokenName: expected string');
        }

        if (Utils.arrayKeyExists(tokenName, RuntimeStringParser.tokens)) {

            let consume = null;

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

            let matches: string[] = reader.canReadExpression(RuntimeStringParser.tokens[tokenName]);

            if (matches) {
                reader.consume(consume === null ? matches[0].length : consume);
                return true;
            } else {
                return false;
            }

        } else {
            throw new Error('Unknown parser token name: ' + tokenName);
        }

    }

    /**
     * If the reader can read token tokenName, returns it's contents, otherwise
     * returns false.
     */
    protected static readString(tokenName, reader: StringParser): any {

        if (!Utils.isString(tokenName)) {
            throw new Error('Invalid argument tokenName: expected string');
        }

        if (Utils.arrayKeyExists(tokenName, RuntimeStringParser.tokens)) {

            let matches = reader.canReadExpression(RuntimeStringParser.tokens[tokenName]);

            if (matches) {
                reader.consume(matches[0].length);
                return matches[0];
            } else {
                return false;
            }

        } else {
            throw new Error('Unknown parser token name: ' + tokenName);
        }

    }

    /**
     * Reads any successive white spaces or comments. Returns true if at least one whitespace
     * or one comment was read.
     */
    protected static readWhiteSpaceOrComment(reader: StringParser) {
        if (reader.eof()) {
            return false;
        }

        let matches = 0,
            result = false;

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

    }

    /**
     * Reads a type property
     */
    protected static readTypeProperty(reader: StringParser, type: Type, readSemiColon: boolean = true) {

        // optionally white space
        RuntimeStringParser.readWhiteSpaceOrComment(reader);

        let returnValue: any = {
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

        } else {

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

        } else {

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

    }

    protected parseType() {

        // we allready parsed the "type" token.

        if (!RuntimeStringParser.readWhiteSpaceOrComment(this)) {
            throw new Error('Unexpected token ' + JSON.stringify(this.nextToken()) + ' at line: ' + this.line() + ' in file ' + this.file());
        }

        let typeName = RuntimeStringParser.readString('TOK_VARIABLE_NAME', this);

        if (typeName === false) {
            throw new Error('Unexpected token ' + JSON.stringify(this.nextToken()) + ', expected type name, at line: ' + this.line() + ' in file ' + this.file());
        }

        let typeExtends = null;

        RuntimeStringParser.readWhiteSpaceOrComment(this);

        if (RuntimeStringParser.read('TOK_EXTENDS', this)) {

            RuntimeStringParser.readWhiteSpaceOrComment(this);

            typeExtends = RuntimeStringParser.readString('TOK_VARIABLE_NAME', this);

            if (typeExtends === false) {
                throw new Error('Unexpected token ' + JSON.stringify(this.nextToken()) + ', expected extended type name, at line: ' + this.line() + ' in file ' + this.file());
            }

        }

        let returnValue = this.runtime.addType(typeName, typeExtends);

        // optionally read a white space or comment
        RuntimeStringParser.readWhiteSpaceOrComment(this);

        if (!RuntimeStringParser.read('TOK_BLOCK_BEGIN', this)) {
            throw new Error('Unexpected token ' + JSON.stringify(this.nextToken()) + ', expected "{", at line: ' + this.line() + ' in file ' + this.file());
        }

        let property;

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

            } else {

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

    }

    protected static readInlineValue(reader: StringParser): any {

        // try read int

        let value: any = RuntimeStringParser.readString('TOK_NUMBER', reader),
            result: string;

        if (Utils.isString(value)) {
            return parseFloat(String(value));
        }

        // try read string
        value = RuntimeStringParser.readString('TOK_STRING', reader);

        if (Utils.isString(value)) {

            value = value.substr(1, value.length - 2);

            result = '';

            for (let i = 0, len = value.length; i < len; i++) {

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

                    } else {

                        result += value.charAt(i);

                    }

                } else {

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

    }

    protected static readEnumValues(reader: StringParser, readAnyInsteadOfVar = false) {

        RuntimeStringParser.readWhiteSpaceOrComment(reader);

        if (!RuntimeStringParser.read('TOK_RBRACKET_BEGIN', reader)) {
            throw new Error('Unexpected token ' + reader.nextToken() + ', expected "(", at line ' + reader.line() + ' in file ' + reader.file());
        }

        let result: string[] = [],
            next: boolean,
            item: any;

        do {

            next = false;

            RuntimeStringParser.readWhiteSpaceOrComment(reader);

            if (readAnyInsteadOfVar) {
                item = RuntimeStringParser.readInlineValue(reader);
            } else {
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

    }

    protected static getValidatorPropertyRules(reader: StringParser, endOfEnumerationToken = 'TOK_SEMICOLON') {

        let rules: any = [],
            operator,
            value,
            error,
            readNext;

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

                    } else {

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
                    } else {
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

            } else {

                error = null;

            }


            readNext = RuntimeStringParser.read('TOK_COMMA', reader);

            if (false === readNext) {

                // is followed by end of instruction?

                if (false === RuntimeStringParser.read(endOfEnumerationToken, reader)) {
                    throw new Error('Unexpected token ' + reader.nextToken() + ', expected <' + endOfEnumerationToken + '> or ",", at line ' + reader.line() + ' in file ' + reader.file());
                } else {
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

    }

    /**
     * Reads a type property
     */
    protected static readValidatorProperty(reader: StringParser, validator: Validator) {

        let rules,
            rule,
            propertyName: any;

        // optionally white space
        RuntimeStringParser.readWhiteSpaceOrComment(reader);

        if (reader.canReadString('@')) {

            rules = RuntimeStringParser.getValidatorPropertyRules(reader);

            try {

                for (let ruleName in rules) {

                    if (!rules.hasOwnProperty(rule)) {
                        continue;
                    }

                    rule = rules[ruleName];

                    validator.addRootCondition(rule.operator, rule.value, rule.error);
                }

            } catch (e) {
                throw new Error('Parser error, at line ' + reader.line() + ' in file ' + reader.file() + ': ' + e.getMessage());
            }

        } else {

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
                for (let ruleName in rules) {

                    if (!rules.hasOwnProperty(rule)) {
                        continue;
                    }

                    rule = rules[ruleName];

                    validator.addPropertyCondition(propertyName, rule.operator, rule.value, rule.error);
                }
            } catch (e) {
                throw new Error('Parser error, at line ' + reader.line() + ' in file ' + reader.file() + ': ' + e.getMessage());
            }

        }

        return validator;

    }

    protected parseValidator() {

        if (!RuntimeStringParser.readWhiteSpaceOrComment(this)) {
            throw new Error('Unexpected token ' + JSON.stringify(this.nextToken()) + ' at line: ' + this.line() + ' in file ' + this.file());
        }

        let validatorName,
            validatorExtends,
            returnValue,
            rule;

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

    }

    public parse() {

        let $result: any;

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
    }

}
