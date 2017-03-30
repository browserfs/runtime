class Type {

    protected runtime: Runtime;

    protected name: string;

    protected _extends: string = null;

    protected properties: IPropertyCollection = null;

    protected index: IIndexDefinition = null;

    constructor(runtime: Runtime, typeName: string, extendsType: string = null) {

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
    public test(mixed: any, errors: any[] = null): boolean {

        let includeErrors: boolean = Utils.isArray(errors);

        if (Utils.isComplex(mixed)) {

            if (includeErrors) {
                errors.push('array | object expected');
            }

            return false;
        }

        let props = this.getRequiredProperties(),
            needsImplementation: any,
            k: string,
            v: any,
            type: string;

        for (let i = 0, len = props.length; i < len; i++) {
            needsImplementation = props[i];
            if (!Utils.hasProperty(mixed, needsImplementation)) {
                if (includeErrors) {
                    errors.push('object ' + JSON.stringify(mixed) + ' does not implement a property called ' + JSON.stringify(needsImplementation));
                }
                return false;
            }
        }

        for (let i = 0, keys: string[] = Utils.getKeys(mixed), len = keys.length; i < len; i++) {
            k = keys[i];
            v = Utils.getProperty(mixed, k);
            if (!(type = this.getPropertyType(k))) {
                if (includeErrors) {
                    errors.push('property ' + JSON.stringify(k) + ' is not implemented in type "' + this.name + '"');
                }
                return false;
            } else {
                if (!this.runtime.isTypeOf(v, type)) {
                    if (includeErrors) {
                        errors.push('property ' + JSON.stringify(k) + ' must be of type ' + JSON.stringify(type));
                    }
                    return false;
                }
            }
        }

        return true;
    }

    /**
     * Test if @param $mixed matches an array with all elements of this type
     */
    public testArray(mixed: any, errors: any[] = null): boolean {

        let includeErrors: boolean = Utils.isArray(errors);

        if (!Utils.isComplex(mixed)) {

            if (includeErrors) {
                errors.push('array | object expected');
            }

            return false;

        }

        let keys: string[];

        for (let i = 0, len = ( keys = Utils.getKeys(mixed) ).length; i < len; i++) {

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

    }

    /**
     * Adds a property to this type
     */
    public addProperty(propertyName: string, propertyType: any): void {

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
    }

    /**
     * Enforces the properties of this interface to match an indexed pattern.
     */
    public addIndex(indexNameType: string, indexValueType: IPropertyDefinition): void {

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

    }

    /**
     * Converts the type ( interface ) to string.
     */
    public toString(): string {

        if (null === this.index && null === this.properties) {

            return this.name;

        } else {

            let result: string = 'interface ' + this.name + ( null === this._extends ? '' : ' extends ' + this._extends ) + ' {',
                out: string[] = [],
                propertyType: any;

            if (this.index !== null) {
                out.push('    [ index: ' + this.index['keyType'] + ' ]: ' + this.runtime.typeToString(this.index['valueType']));
            }

            if (this.properties !== null) {

                for (let propertyName in this.properties) {
                    if (this.properties.hasOwnProperty(propertyName)) {
                        propertyType = this.properties[propertyName];
                        out.push('    ' + propertyName + ( propertyType['optional'] ? '?' : '' ) + ': ' + this.runtime.typeToString(propertyType));
                    }
                }

            }

            if (out.length) {
                result = result + "\n" + out.join(";\n") + ";\n";
            }

            result = result + '}';

            return result;
        }
    }

    /**
     * Test if a property is valid inside an interface
     */
    public validPropertyKey(propertyName: any): boolean {

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

            let _extendsType = this.runtime.getType(this._extends);

            if (_extendsType) {
                return _extendsType.validPropertyKey(propertyName);
            }

        }

        return false;

    }

    /**
     * Returns the type of the property @propertyName inside this interface
     */
    public getPropertyType(propertyName: any): any {

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

            let _extends = this.runtime.getType(this._extends);

            if (_extends) {
                return _extends.getPropertyType(propertyName);
            }

        }

        return false;

    }

    /**
     * Returns the list with all the required properties of an interface (optional ones are excluded from this list)
     */
    public getRequiredProperties(): string[] {

        let result: string[] = [];

        if (this.properties !== null) {

            for (let propertyName in this.properties) {
                if (this.properties.propertyIsEnumerable(propertyName)) {
                    if (this.properties[propertyName].optional === false) {
                        result.push(propertyName);
                    }
                }
            }

        } else {
            result = [];
        }

        if (null !== this._extends) {

            let _extends = this.runtime.getType(this._extends);

            if (_extends) {
                result = Utils.arrayMerge(result, _extends.getRequiredProperties());
            }
        }

        return Utils.arrayValues(Utils.arrayUnique(result));

    }
}
