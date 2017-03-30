class IntegerType extends Type {

    public test( mixed: any, errors: any[] = null ): boolean {
        return Utils.isInt( mixed );
    }
}
