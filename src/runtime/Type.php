<?php

	namespace browserfs\runtime;

	/**
	 * Class implementing a type ( interface ).
	 */

	class Type {

		// runtine in which this type is declared
		protected $runtime = null;

		// data type name
		protected $name = null;

		// if the type extends another type
		protected $extends = null;

		// type properties
		protected $properties = null;

		// type index
		protected $index = null;

		// creates a new type
		public function __construct( \browserfs\Runtime $runtime, $typeName, $extendsType = null ) {
			
			$this->runtime = $runtime;
			$this->name = $typeName;
			
			if ( $extendsType !== null ) {
				
				if ( !is_string( $extendsType ) ) {
					throw new \browserfs\runtime\Exception('Invalid argument $extendsType: must be string | null');
				}

				$this->extends = $extendsType;

			}

		}

		/**
		 * Test if @param $mixed matches this type
		 * @param $mixed:  <any>, object to test
		 * @param $errors: <array>, optional
		 */
		public function test( $mixed, &$errors = null ) {
			
			$includeErrors = is_array( $errors );

			if ( !\browserfs\runtime\Utils::isComplex( $mixed ) ) {
				if ( $includeErrors ) {
					$errors[] = 'array | object expected';
				}
				return false;
			}

			$props = $this->getRequiredProperties();

			foreach ( $props as $needsImplementation ) {
				if ( !\browserfs\runtime\Utils::hasProperty( $mixed, $needsImplementation ) ) {
					if ( $includeErrors ) {
						$errors[] = 'object ' . json_encode( $mixed ) . ' does not implement a property called ' . json_encode( $needsImplementation );
					}
					return false;
				}
			}

			foreach ( \browserfs\runtime\Utils::getKeys( $mixed ) as $k ) {

				$v = \browserfs\runtime\Utils::getProperty( $mixed, $k );

				if ( !( $type = $this->getPropertyType( $k ) ) ) {
					
					if ( $includeErrors ) {
						$errors[] = 'property ' . json_encode( $k ) . ' is not implemented in type "' . $this->name . '"';
					}
					
					return false;
				
				} else {
				
					if ( !$this->runtime->isTypeOf( $v, $type ) ) {

						if ( $includeErrors ) {
							$errors[] = 'property ' . json_encode( $k ) . ' must be of type ' . json_encode( $type );
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
		public function testArray( $mixed, &$errors = null ) {
			
			$includeErrors = is_array( $errors );

			if ( !\browserfs\runtime\Utils::isComplex( $mixed) ) {
				
				if ( $includeErrors ) {
					$errors[] = 'array | object expected';
				}
				
				return false;
			
			}

			for ( $i=0, $len = count( $keys = \browserfs\runtime\Utils::getKeys( $mixed ) ); $i<$len; $i++ ) {
				
				if ( !in_array( $i, $keys ) ) {
					if ( $includeErrors ) {
						$errors[] = 'array | complex type expected';
					}
					return false;
				}
				
				if ( !$this->test( \browserfs\runtime\Utils::getProperty( $mixed, $i), $errors ) ) {
					if ( $includeErrors ) {
						$errors[] = 'index #' . \browserfs\runtime\Utils::getProperty( $mixed, $i ) . ' is not a ' . $this->name;
					}
					return false;
				}
			}

			return true;

		}

		/**
		 * Adds a property to this type
		 */
		public function addProperty( $propertyName, $propertyType ) {

			if ( $this->properties === null ) {
				$this->properties = [];
			}

			if ( !is_string( $propertyName ) || $propertyName == '' ) {
				throw new \browserfs\runtime\Exception('Invalid argument: propertyName must be of type string!' );
			}

			if ( !is_array( $propertyType ) ) {
				throw new \browserfs\runtime\Exception('Invalid argument: propertyType must be of type array!' );
			}

			if ( isset( $this->properties[ $propertyName ] ) ) {
				throw new \browserfs\runtime\Exception('Duplicate property "' . $propertyName . '" in interface "' . $this->name . '"' );
			}

			$this->properties[ $propertyName ] = $propertyType;
		}

		/**
		 * Enforces the properties of this interface to match an indexed pattern.
		 */
		public function addIndex( $indexNameType, $indexValueType ) {
			
			if ( $this->index !== null ) {
				throw new \browserfs\runtime\Exception( 'Interface "' . $this->name . '" allready has a assigned index' );
			}

			if ( !is_string( $indexNameType ) || $indexNameType == '' ) {
				throw new \browserfs\runtime\Exception('Invalid argument ( indexNameType )' );
			}

			if ( $indexNameType != 'int' && $indexNameType != 'number' && $indexNameType != 'string' ) {
				throw new \browserfs\runtime\Exception('Invalid index name type. Index names can be of type number | string' );
			}

			if ( !is_array( $indexValueType ) ) {
				throw new \browserfs\runtime\Exception('Invalid argument: indexValueType must be of type array!' );
			}

			$this->index = [
				'keyType' => $indexNameType,
				'valueType' => $indexValueType
			];

		}

		/**
		 * Converts the type ( interface ) to string.
		 */
		public function __toString() {
		
			if ( $this->index === null && $this->properties === null ) {
		
				return $this->name;
		
			} else {
				$result = 'interface ' . $this->name . ( $this->extends === null ? '' : ' extends ' . $this->extends ) . ' {';

				$out = [];

				if ( $this->index !== null ) {
					$out[] = '    [ index: ' . $this->index[ 'keyType' ] . ' ]: ' . $this->runtime->typeToString( $this->index[ 'valueType' ] ); 
				}

				if ( $this->properties !== null ) {
					foreach ( $this->properties as $propertyName => $propertyType ) {
						$out[] = '    ' . $propertyName . ( $propertyType['optional'] ? '?' : '' ) . ': ' . $this->runtime->typeToString( $propertyType );
					}
				}

				if ( count( $out ) ) {
					$result .= "\n" . implode( ";\n", $out ) . ";\n";
				}

				$result .= '}';

				return $result;
			}
		}

		/**
		 * Test if a property is valid inside an interface
		 */
		public function validPropertyKey( $propertyName ) {

			// non-object interface, native type
			if ( $this->properties === null && $this->index === null ) {
				return false;
			}

			// a property name must be either string, or number
			if ( !is_string( $propertyName ) && !is_int( $propertyName ) ) {
				return false;
			}

			// a property name cannot be empty!
			if ( is_string( $propertyName ) && $propertyName == '' ) {
				return false;
			}

			// test to see if a property exists
			if ( $this->properties !== null ) {

				if ( array_key_exists( $propertyName, $this->properties ) ) {
					return true;
				}

			}

			// test to see if this object has an index
			if ( $this->index !== null ) {

				if ( $this->runtime->isTypeOf( $propertyName, $this->index['keyType']) ) {
					return true;
				}
			
			}

			// test to see if this object extends an interface, and the key is valid in that interface
			if ( $this->extends !== null ) {
				
				$extends = $this->runtime->getType( $this->extends );
				
				if ( $extends ) {
					return $extends->validPropertyKey( $propertyName );
				}

			}

			return false;

		}

		/**
		 * Returns the type of the property @propertyName inside this interface
		 */
		public function getPropertyType( $propertyName ) {

			// non-object interface, native type
			if ( $this->properties === null && $this->index === null ) {
				return false;
			}

			// a property name must be either string, or number
			if ( !is_string( $propertyName ) && !is_int( $propertyName ) ) {
				return false;
			}

			// a property name cannot be empty!
			if ( is_string( $propertyName ) && $propertyName == '' ) {
				return false;
			}

			// test to see if a property exists
			if ( $this->properties !== null ) {

				if ( array_key_exists( $propertyName, $this->properties ) ) {
					return $this->properties[ $propertyName ][ 'type' ];
				}

			}

			// test to see if this object has an index
			if ( $this->index !== null ) {

				if ( $this->runtime->isTypeOf( $propertyName, $this->index['keyType']) ) {
					return $this->index['valueType']['type'];
				}
			
			}

			// test to see if this object extends an interface, and the key is valid in that interface
			if ( $this->extends !== null ) {
				
				$extends = $this->runtime->getType( $this->extends );
				
				if ( $extends ) {
					return $extends->getPropertyType( $propertyName );
				}

			}

			return false;

		}

		/**
		 * Returns the list with all the required properties of an interface (optional ones are excluded from this list)
		 */
		public function getRequiredProperties() {

			if ( $this->properties !== null ) {
				
				$result = [];

				foreach ( array_keys( $this->properties ) as $propertyName ) {
					if ( $this->properties[ $propertyName ][ 'optional' ] === false ) {
						$result[] = $propertyName;
					}
				}

			} else {
				$result = [];
			}

			if ( $this->extends !== null ) {
				
				$extends = $this->runtime->getType( $this->extends );

				if ( $extends ) {
					$result = array_merge( $result, $extends->getRequiredProperties() );
				}
			}

			return array_values( array_unique( $result ) );

		}

	}

?>