# Runtime Types
A PHP library used to test at runtime if a value matches a pattern ( or a type ).

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
  @instanceof 'WebserviceResponse';
  
  // the stable version is right now 8, so we're using the v8 validator
  meta: @require 'WebserviceV8MetaValidator';
  
  // force the minimum data length to be 32
  data: @minlength 32;
}
```

**SomeClassFile.php**
```php
<?php
    ...
    
    // load our types and validators into a object called "runtime".
    // 
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
