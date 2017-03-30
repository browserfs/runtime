interface IIndexDefinition {
    keyType: string;
    valueType: IPropertyDefinition;
}

interface IPropertyDefinition {
    type: string;
    optional: boolean;
}

interface IPropertyCollection {
    [key: string]: IPropertyDefinition;
}

interface ITypesCollection {
    [key: string]: Type;
}

interface IValidatorsCollection {
    [key: string]: Validator;
}