class DecimalType extends Type {

    public test( mixed: any, errors: any[] = null ): boolean {

        return Utils.isFloat(mixed);

    }

}