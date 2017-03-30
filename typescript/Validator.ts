class Validator {

    private runtime: Runtime = null;

    private name: string = null;

    private _extends: string = null;

    private extended: boolean = false;

    protected rootRules: any = null;

    protected propertyRules: any = null;

    private lastTestedValue: any = null;

    constructor(runtime: Runtime, validatorName: string, extendsValidator: string = null) {
        this.runtime = runtime;
        this.name = validatorName;

        if (null === extendsValidator || Utils.isString(extendsValidator)) {
            this._extends = extendsValidator;
        } else {
            throw new Error('Invalid argument: extendsValidator: null|string expected!');
        }
    }

    /**
     * Root conditions are used for primitive data types.
     */
    public addRootCondition(operator, value, error = null) {
        throw new Error('Validator::addRootCondition (and some more methods) are not ported to javascript version!');
    }

    /**
     * Property conditions are used for complex data types.
     */
    public addPropertyCondition(propertyName, operator, value, error = null) {
        throw new Error('Validator::addPropertyCondition (and some more methods) are not ported to javascript version!');
    }

    public test(mixed: any, errors: string[] = null): boolean {
        throw new Error('Validator::test (and some more methods) are not ported to javascript version');
    }


}
