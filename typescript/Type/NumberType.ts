class NumberType extends Type {

    public test(mixed: any, errors: any[] ): boolean {
        return typeof mixed === 'number' && isFinite(mixed);
    }

}
