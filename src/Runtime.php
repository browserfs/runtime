<?php
	
	namespace browserfs;

	class Runtime {

		// here we register types
		protected $types = null;
		protected $validators = null;

		protected $files = [];

		/**
		 * Constructor. Creates a new Runtime
		 */
		public function __construct() {

			// register native types
			$this->types = [ 
				'int'     => new runtime\Type\Int($this, 'int'),
				'float'   => new runtime\Type\Float($this, 'float'),
				'number'  => new runtime\Type\Number($this, 'number'),
				'boolean' => new runtime\Type\Boolean($this, 'boolean'),
				'string'  => new runtime\Type\String($this, 'string'),
				'any'     => new runtime\Type\Any($this, 'any')
			];

			$this->validators = [];

		}

		/**
		 * Creates a new RunTime type
		 * @param $typeName string
		 * @return \browserfs\runtime\Type
		 * @throws \browserfs\runtime\Exception
		 */
		public function addType( $typeName, $extendsType = null ) {
			if ( !$this->isTypeName( $typeName ) ) {
				throw new \browserfs\runtime\Exception('Invalid type name `' . json_encode( $typeName ) . '`. The type name must be a string' );
			}

			if ( $this->isTypeRegistered( $typeName ) ) {
				return $this->types[ $typeName ];
			} else {
				return $this->types[ $typeName ] = new runtime\Type($this, $typeName, $extendsType );
			}
		}

		/**
		 * Creates a new Runtime validator
		 * @param $validatorName string
		 * @return \browserfs\runtime\Validator
		 * @throws \browserfs\runtime\Exception
		 */
		public function addValidator( $validatorName, $extendsValidator = null ) {
			if ( !$this->isValidatorName( $validatorName ) ) {
				throw new \browserfs\runtime\Exception('Invalid validator name');
			}

			if ( $this->isValidatorRegistered( $validatorName ) ) {
				return $this->validators[ $validatorName ];
			} else {
				return $this->validators[ $validatorName ] = new runtime\Validator( $this, $validatorName, $extendsValidator );
			}
		}

		/**
		 * Returns TRUE or FALSE if a string can represent a type name
		 * @param $typeName string representing a name of a data type
		 * @return boolean
		 */
		protected function isTypeName( $typeName ) {
			return is_string( $typeName ) &&
			       strlen( $typeName ) &&
			       preg_match( '/^[a-zA-Z_]([a-zA-Z0-9_]+)?(\[\])?$/', $typeName )
		       ? true
		       : false;
		}

		/**
		 * Returns TRUE or FALSE if a string can represend a validator name
		 */
		protected function isValidatorName( $validatorName ) {
			return is_string( $validatorName ) &&
				   strlen( $validatorName ) &&
				   preg_match( '/^[a-zA-Z_]([a-zA-Z0-9_]+)?$/', $validatorName )
				? true
				: false;
		}

		/**
		 * Returns true or false if a type is registered into runtime types
		 * @param $typeName string
		 * @return boolean
		 */
		public function isTypeRegistered( $typeName ) {
			return is_string( $typeName ) && array_key_exists( $typeName, $this->types );
		}

		/**
		 * Returns true or false if a validator is registered into this runtime
		 */
		public function isValidatorRegistered( $validatorName ) {
			return is_string( $validatorName ) && array_key_exists( $validatorName, $this->validators );
		}

		/**
		 * Returns true if an object matches a registered type
		 */
		public function isTypeOf( $mixed, $typeName, &$errors = null ) {
			
			if ( func_num_args() == 3 ) {
				$errors = [];
			} else {
				$errors = null;
			}

			if ( $this->isTypeName( $typeName ) ) {

				$isArray = substr( strrev( $typeName ), 0, 2 ) == '][';

				if ( $isArray ) {
					$typeName = substr( $typeName, 0, strlen( $typeName ) - 2 );
				}

				if ( $this->isTypeRegistered( $typeName ) ) {
					
					if ( $isArray ) {

						$result = $this->types[ $typeName ]->testArray( $mixed, $errors );
						
						if ( is_array( $errors ) && count($errors) == 0 ) {
							$errors = false;
						}

						return $result;

					} else {

						$result = $this->types[ $typeName ]->test( $mixed, $errors );
						
						if ( is_array( $errors ) && count($errors) == 0 ) {
							$errors = false;
						}
						
						return $result;
					}

				} else {
					throw new \browserfs\runtime\Exception('Type "' . $typeName . '" is not declared' );
				}
			} else {
				throw new \browserfs\runtime\Exception('Argument $typeName must be a valid type string name' );
			}
		}

		/**
		 * Returns true if an object validates by a registered validator, or false otherwise
		 */
		public function isValidatableBy( $mixed, $validatorName, &$errors = null ) {
			if ( func_num_args() === 3 ) {
				$errors = [];
			} else {
				$errors = null;
			}

			if ( $this->isValidatorName( $validatorName ) ) {

				if ( $this->isValidatorRegistered( $validatorName ) ) {
					
					$result = $this->validators[ $validatorName ]->test( $mixed, $errors );

					if ( is_array( $errors ) && count( $errors ) == 0 ) {
						$errors = false;
					}

					return $result;

				} else {
					throw new \browserfs\runtime\Exception('Validator "' . $validatorName . '" is not declared' );
				}

			} else {
				throw new \browserfs\runtime\Exception('Argument $validatorName must be a valid validator string name' );
			}
		}

		/**
		 * Converts a type to a string.
		 * @param type string | [ optional => boolean, type => string ]
		 */
		public function typeToString( $type ) {

			if ( is_string( $type ) ) {
				return $type;
			} else
			if ( is_array( $type ) ) {
				return $type['type'];
			}

		}

		/**
		 * Dumps all registered types to a string
		 */
		public function __toString() {
			
			$out = [];

			foreach ( $this->types as $name ) {
				if ( !in_array( $name, [ 'string', 'int', 'float', 'boolean', 'number', 'any' ] ) ) {
					$out[] = $name . '';
				}
			}

			foreach ( $this->validators as $name ) {
				$out[] = $name . '';
			}

			return implode( "\n\n", $out );
		}

		/**
		 * Returns the previously registered type with the name $typeName.
		 */
		public function getType( $typeName ) {
			if ( is_string( $typeName ) && isset( $this->types[$typeName] ) ) {
				return $this->types[ $typeName ];
			} else {
				return null;
			}
		}

		/**
		 * Returns the previously registered type with the name $typeName.
		 */
		public function getValidator( $validatorName ) {
			if ( is_string( $validatorName ) && isset( $this->validators[$validatorName] ) ) {
				return $this->validators[ $validatorName ];
			} else {
				return null;
			}
		}

		/**
		 * Imports types from a file in current runtime. Use this method
		 * if you allready instantiated a runtime, and you want to load
		 * later aditional definitions inside it.
		 *
		 */
		public function load( $definitionFile ) {
			
			if ( !is_string( $definitionFile ) ) {
				throw new \browserfs\runtime\Exception('Invalid argument definitionFile. Must be string!');
			}
			
			if ( !strlen( $definitionFile ) ) {
				throw new \browserfs\runtime\Exception('Invalid argument definitionFile. Must be non-empty!');
			}

			$filePath = @realpath( $definitionFile );

			if ( $filePath === false ) {
				throw new \browserfs\runtime\Exception('File "' . $definitionFile . '" does not exist!' );
			}

			if ( isset( $this->files[ $filePath ] ) ) {
				// allready loaded
				return $this;
			}

			$fileData = @file_get_contents( $filePath );

			if ( is_string( $fileData ) ) {

				$parser = new runtime\String\Reader( $fileData, $filePath, $this );

				$this->files[ $filePath ] = true;

			} else {
				throw new runtime\Exception('File "' . $definitionFile . '" could not be read!' );
			}

			return $this;

		}

		/**
		 * Creates a new runtime from a list of ".types" files.
		 *
		 * @param $filesList   - a list of ".types" files to load
		 * @param $loadStdDefs - load standard definitions ( default = true )
		 * @return \browserfs\Runtime
		 * @throws \browserfs\runtime\Exception
		 */
		public static function create( $filesList, $loadStdDefs = true ) {
			
			$result = new self();

			if ( $loadStdDefs ) {
				$result->load( __DIR__ . '/../std/builtin.types' );
			}

			if ( is_array( $filesList ) ) {

				foreach ( $filesList as $fileName ) {

					if ( is_string( $fileName ) ) {
						$result->load( $fileName );
					} else {
						throw new \browserfs\runtime\Exception('Failed to load definitions from ' . json_encode( $fileName ) );
					}

				}

			}

			return $result;

		}

	}

?>