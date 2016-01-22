<?php
	
 /**
 * An example of a project-specific implementation.
 * 
 * After registering this autoload function with SPL, the following line
 * would cause the function to attempt to load the \Foo\Bar\Baz\Qux class
 * from /path/to/project/src/Baz/Qux.php:
 * 
 *      new \Foo\Bar\Baz\Qux;
 *      
 * @param string $class The fully-qualified class name.
 * @return void
 */

function autoload_init( $class_prefix, $base_dir ) {

	spl_autoload_register(function ($class) use ( $base_dir, $class_prefix ) {

	    // does the class use the namespace prefix?
	    $len = strlen($class_prefix);

	    if (strncmp($class_prefix, $class, $len) !== 0) {
	        // no, move to the next registered autoloader
	        return;
	    }

	    // get the relative class name
	    $relative_class = substr($class, $len);

	    // replace the namespace prefix with the base directory, replace namespace
	    // separators with directory separators in the relative class name, append
	    // with .php
	    $file = $base_dir . str_replace('\\', '/', $relative_class) . '.php';

	    // if the file exists, require it
	    if (file_exists($file)) {
	        require $file;
	    }
	});

}

autoload_init( 'browserfs\\', __DIR__ . '/src/' );

throw new \Exception( json_encode( scandir( __DIR__ . '/..' ), JSON_PRETTY_PRINT ) );