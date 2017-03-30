class VarcharType extends Type {

    public test( mixed: any, errors: any[] = null ): boolean {
        return typeof mixed === 'string';
    }

}