class Runtime {

    protected types: ITypesCollection = null;
    protected validators: IValidatorsCollection = null;

    constructor() {
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

    public addType(typeName: string, extendsType: string = null): Type {
        if (!this.isTypeName(typeName)) {
            throw new Error('Invalid type name `' + JSON.stringify(typeName) + '`. The type name must be a string');
        }

        if (this.isTypeRegistered(typeName)) {
            return this.types[typeName];
        } else {
            return this.types[typeName] = new Type(this, typeName, extendsType);
        }
    }

    public addValidator(validatorName: string, extendsValidator: string = null): Validator {
        if (!this.isValidatorName(validatorName)) {
            throw new Error('Invalid validator name');
        }

        if (this.isValidatorRegistered(validatorName)) {
            return this.validators[validatorName];
        }
        else {
            return this.validators[validatorName] = new Validator(this, validatorName, extendsValidator);
        }
    }

    protected isTypeName(typeName: string): boolean {
        return Utils.isString(typeName) && typeName !== '' && /^[a-zA-Z_]([a-zA-Z0-9_]+)?(\[\])?$/.test(typeName)
            ? true
            : false;
    }

    protected isValidatorName(validatorName: string): boolean {
        return Utils.isString(validatorName) && validatorName !== '' && /^[a-zA-Z_]([a-zA-Z0-9_]+)?$/.test(validatorName)
            ? true
            : false;
    }

    public isTypeRegistered(typeName: string): boolean {
        return Utils.isString(typeName) && Utils.arrayKeyExists(typeName, this.types);
    }

    public isValidatorRegistered(validatorName: string): boolean {
        return Utils.isString(validatorName) && Utils.arrayKeyExists(validatorName, this.validators);
    }

    public isTypeOf(mixed: any, typeName: string, errors: string[] = null): boolean {

        if (null !== errors) {
            errors.splice(0, errors.length);
        }

        if (this.isTypeName(typeName)) {

            let isArray: boolean = Utils.reverseString(typeName).substr(0, 2) == '][',
                result: boolean;

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

                } else {

                    result = this.types[typeName].test(mixed, errors);

                    if (Utils.isArray(errors) && errors.length === 0) {
                        errors = null;
                    }

                    return result;
                }

            } else {
                throw new Error('Type "' + typeName + '" is not declared');
            }
        } else {
            throw new Error('Argument typeName must be a valid type string name');
        }
    }

    /**
     * Returns true if an object validates by a registered validator, or false otherwise
     */
    public isValidatableBy(mixed: any, validatorName: string, errors: string[] = null) {

        if (null !== errors) {
            errors.splice(0, errors.length);
        }

        if (this.isValidatorName(validatorName)) {

            let result: boolean;

            if (this.isValidatorRegistered(validatorName)) {

                result = this.validators[validatorName].test(mixed, errors);

                if (Utils.isArray(errors) && errors.length === 0) {
                    errors = null;
                }

                return result;

            } else {
                throw new Error('Validator "' + validatorName + '" is not declared');
            }

        } else {
            throw new Error('Argument validatorName must be a valid validator string name');
        }
    }

    public typeToString(type: IPropertyDefinition | any): string {

        if (Utils.isString(type)) {

            return type;

        } else if (Utils.isComplex(type)) {

            if (Utils.isString(type.type)) {
                return type.type;
            }

        }
        throw new Error('Invalid argument: string|IPropertyDefinition expected');
    }

    public toString(): string {

        let out: string[] = [];

        for (let name in this.types) {
            if (this.types.hasOwnProperty(name)) {
                if (['string', 'int', 'float', 'boolean', 'number', 'any'].indexOf(name) === -1) {
                    out.push(name.toString());
                }
            }
        }

        for (let name in this.validators) {
            if (this.validators.hasOwnProperty(name)) {
                out.push(name.toString());
            }
        }

        return out.join("\n\n");
    }

    public getType(typeName: string): Type {
        if (Utils.isString(typeName) && Utils.isSet(this.types[typeName])) {
            return this.types[typeName];
        } else {
            return null;
        }
    }

    public getValidator(validatorName: string): Validator {
        if (Utils.isString(validatorName) && Utils.isSet(this.validators[validatorName])) {
            return this.validators[validatorName];
        } else {
            return null;
        }
    }

    public load( definitionFileBufferContents: string ): this {

        if ( !Utils.isString( definitionFileBufferContents ) ) {
            throw new Error('Invalid argument definitionFileBufferContents. Must be string!');
        }

        if ( definitionFileBufferContents === '' ) {
            throw new Error('Invalid argument definitionFileBufferContents. Must be non-empty!');
        }

        new RuntimeStringParser( definitionFileBufferContents, '<Buffer>', this );

        return this;

    }

    /**
     * Creates a new runtime from a list of ".types" files.
     *
     * @param buffer   - a list of ".types" files to load
     * @return Runtime
     * @throws Error
     */
    public static createFromString(buffer: string): Runtime {

        let result = new Runtime();

        if (Utils.isString(buffer)) {
            result.load(buffer);
        } else {
            throw new Error('Failed to load definitions from string: ' + JSON.stringify(buffer));
        }

        return result;

    }


}