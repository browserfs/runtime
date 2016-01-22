# Runtime Types
A PHP library used to test at runtime if a value matches a pattern ( or a type ).

[![Build Status](https://travis-ci.org/browserfs/runtime.svg?branch=master)](https://travis-ci.org/browserfs/runtime)

## Why?
How many times, and how many lines of code you had to write in order 
to check the type of data and the values in data provided from webservices,
user input, forms, or parsed files?

Example 1:
```php
<?php
    ...
    $result = json_decode( $myWebServiceJSONResponse );
    
    if ( is_array( $result )
         && isset( $result["meta"] )
         && is_array( $result["meta"] )
         && isset( $result["meta"]["version"] )
         && is_int( $result["meta"]["version"] )
         && $result["meta"]["version"] == 8
         && isset( $result["meta"]["hasData"] )
         && $result["meta"]["hasData"] == true
    ) {
        // ok, webservice response v.8
        
        $utilData = isset( $result["data"] )
          && is_string( $result["data"] )
          && strlen( $result["data"] ) >= 32
            ? $result["data"]
            : null;
        
    }
    ...
?>
```

Example 2:
```php
<?php
  
  // begin form validation ...
  
  $age = isset( $_POST['age'] ) 
    && preg_match( '/^[\d]+$/', $_POST['age'] )
    && (int)$_POST['age'] > 20
      ? (int)$_POST['age']
      : null;
  
  $name = isset( $_POST['name'] )
    && strlen( $_POST['name'] ) > 0
    && preg_match( '/^[a-z\\s]{2,30}$/i', $_POST['name'] )
      ? $_POST['name']
      : null;
  
  if ( $age === null ) {
    throw new Exception('Please submit a valid age!' );
  }
  
  if ( $name === null ) {
    throw new Exception('Please submit a valid name, containing only letters and characters');
  }
  
  // end form parameters input validation ...

?>
```

## How?

**Example 1** could be wrote, in a decoupled manner, as:

**defs/Webservices.defs**
```
type WebserviceResponse {
  meta: WebserviceMetaResponse;
  data?: string;
}

type WebserviceMetaResponse {
  version: number;
  hasData: boolean;
}

validator WebserviceMetaValidator {
  meta: @min 1;
}

validator WebserviceV8MetaValidator extends WebserviceValidator {
  meta: @is 8;
  hasData: @is true;
}

validator WebserviceResponse {
  // the response should match the data type "WebserviceResponse"
  @instanceof WebserviceResponse;
  
  // the stable version is right now 8, so we're using the v8 validator
  meta: @require WebserviceV8MetaValidato';
  
  // force the minimum data length to be 32
  data: @minlength 32;
}
```

**SomeClassFile.php**
```php
<?php
    ...
    
    // load our types and validators into a object called "runtime".
    $runtime = \browserfs\Runtime::create([
      __DIR__ . '/defs/Webservices.defs',
      ..., // other definition file
      ...,
      ..., // other definition file
    ]);
    
    $result = json_decode( $myWebServiceJSONResponse );
    
    // if $result is validated by our validator called
    // WebserviceResponse, then we're done, all fields
    // are in their place as expected
    if ( $runtime->isValidatableBy( $result, 'WebserviceResponse', $errors ) ) {
      
      // good, webservice response is valid, everything's fine
      $utilData = $result['data'];
    
    } else {
    
      // we've got errors:
      print_r( $errors );

    }
?>
```

In the above example, we tested if the $result variable is validatable by the
validator called "WebserviceResponse". If any errors are encountered by the
validator, in optional argument $errors, the testing system is storing all
the errors occured.

**Example 2** could be wrote as follows:

**defs/SampleRequest.type**
```

// first we're ensuring that the data has a structure
type SamplePostRequestType {
  age: sint;      // age is a string representing an integer value
  name: string;   // name is a string
}

// and after than we're ensuring that the value respects a pattern
validator SamplePostRequest {
  
  @instanceof SamplePostRequestType;

  age: @min 20 => 'We expected for you to be at least 20 years old, but you are {$value} years',
       @max 100 => 'We believe that you are too old in order to fill in this form ( you stated that you have {$value} years )';

  name: @match '/^[a-z\\s]{2,30}$/i' => 'Please provide a name containing only letters and spaces, of minimum 2 and maximum 3 characters';

}

```

**SampleClass.php**
```php
<?php
  ...

  // load our types and validators into a object called "runtime".
  $runtime = \browserfs\Runtime::create([
    __DIR__ . '/defs/SampleRequest.type'
  ]);

  if ( $runtime->isValidatableBy( $_POST, 'SamplePostRequest', $errors ) ) {

  }

```

# Data types and validators

There are built-in data types, and user defined data types. User defined data types
are wrote in a definition file ( extension ".types" ). The library creates a
environment ( called **runtime** ), where it store the data types and the validators
parsed from the ".types" files you wrote.

After that, the flow is easy, you can test:

- if a value of any type respects a data type you previously defined ( or a built-in type )
- if a value of any type can be validated with the help of a validator you previously defined

## Built-in types

This library defines the following primitives built in types:

- int - native php int type
- float - native php float type
- number - any value that is either native php int, either php float
- sint - any decimal string that can be parsed as an integer
- sfloat - any decimal string that can be parsed as a float 
- snumber - any decimal string that can be parsed either as an integer, either as a float
- string - native php string type
- boolean - native php boolean type
- any - any type of data

## User defined types

Having the built-in types, we can create user-defined types ( complex types ) in a .types file,
by respecting the following syntax:

```
type <TypeName> [ extends <OtherTypeName> ] {
  <key_name_1>: <key_type_1>,
  <key_name_2>: <key_type_2>,
  ...
  [ <index_key>: <index_key_type> ]: <key_type_value>
}
```

<TypeName>, <OtherTypeName>, <key_name_1>, <key_name_2>, <index_key> must be valid identifier names.

Examples:

```
type Person {
  id: number;
  name: string;
}

type Student extends Person {
  grades: number[]; // Grades is an array containing only elements of type number
}

type StudentCollection {
  [ index: number ]: Student;
}

type StudentHashCollection {
  [ index: string ]: Student;
}
```

## Validators

After we defined our data types, we need a mechanism to validate the values
we store in them. For this case, we implemented Validators.

The syntax of a validator is as follows:

```
validator <ValidatorName> [ extends <OtherValidator> ] {

  // Root operators ( are aplied on the value itself )
  [ 
      <@operator_1> <argument> [ => '<Error>' ],
      <@operator_2> <argument> [ => '<Error>' ],
      ...
      <operator_n> <value> [ => '<Error>' ]
      ; // End of root object operators
  ]

  // Properties operators ( are aplied on the properties of the value )
  <key_name_1>: <@operator_1> <argument> [ => '<Error>' ],
                <@operator_2> <argument> [ => '<Error>' ],
                ...
                <@operator_n> <argument> [ => '<Error>' ];

  <key_name_2>: <@operator_1> <argument> [ => '<Error>' ],
                <@operator_2> <argument> [ => '<Error>' ],
                ...
                <@operator_n> <argument> [ => '<Error>' ];
  ...

  <key_name_n>: <@operator_1> <argument> [ => '<Error>' ],
                <@operator_2> <argument> [ => '<Error>' ],
                ...
                <@operator_n> <argument> [ => '<Error>' ];

}
```

## Operators of a validator:

**@min** -> used to test if a value is >= than the <argument>
**@max** -> used to test if a value is <= than the <argument>

```
validator MinAndMaxOperatorExample {
   foo: @min 2 => 'The foo value of this object must be greater than 2!';
   bar: @max 10 => 'The "bar" value of this object must be max 10';
}
```

**@minlength** -> used to test if the length of a value is >= than the <argument>
**@maxlength** -> used to test if the length of a value is <= than the <argument>
**@length** -> used to test if the length of a value is = with the argument

```
validator MinLengthMaxLengthAndLengthExample {
  name:    @minLength 2  => 'The name of the person must be at least 2 characters length';
  grades:  @minLength 4  => 'You must specify at least 4 grades';
  address: @maxLength 20 => 'The address can contain maximum 20 characters!';
  md5hash: @length 32    => 'The encrypted password must have exactly 32 characters!';
}
```

**@is** -> used to test if a value is === with the argument
**@isnot** -> used to test if a value is !== with the argument

```
validator IsAndIsNotExample {
  password: @isnot 'test' => 'Error: Password too weak';
  foo: @is true;
  bar: @is 3;
  version: @isnot 10 => 'Version #10 is not supported!';
}
```

**@in** -> used to test if a value is member of a set of values ( in this case the argument is a set of values )
**@nin** -> used to test if a value is not member of a set of values ( in this case the argument is a set of values )

```
validator InAndNotInExample {
  password: @nin( 'test', 'test123', 'admin', 'password' ) => 'Error: Password is too common!';
  cityId: @in( 23, 14, 15 ) => 'Error: Invalid city id!';
}
```

**@match** -> used to test if a value matches against a regular expression

```
validator MatchValidatorExample {
  name: @match "/^[a-z]+$/"i => 'Error: Your name must contain only letters!';
}
```

**@require** -> used to require other validators at current position ( needs to be explained better )

```
validator RequireChild {
  foo: @minlength 3,
       @maxlength 10;
}

validator OtherRequireChild {
  bar: @match '/^boo/';
}

validator RequireCompositionExample {
  // All the rules from RequireChild and OtherRequireChild validator are imported
  // in the root of this validator
  @require ( RequireChild, OtherRequireChild );

  otherProperty: @in( 3, 4 );
}
```

**@instanceof** -> used to test if current object or property is of type of the argument of the operator

```
type Person {
  age: number;
  name: string;
}

validator PersonValidator {
  
  // validates only objects which are of type person
  @instanceof Person;

}

validator PropertyInstanceValidator {
  
  // the foo property of this validator must be of type "number"
  foo: @instanceof number,
       @min: 2;
}

```

**@index** -> used to specify aditional operators on a validator

```
/// to document

```

**@oneof** -> used to create variant validators

```
validator CARD_VISA {
  @type string,
  @match "/^4[0-9]{15}$/";
}

validator CARD_MASTERCARD {
  @type string,
  @match "/^52[0-9]{12}$";
}

validator CREDIT_CARD {
  @oneof (
    CARD_VISA,
    CARD_MASTERCARD
  );
}
```