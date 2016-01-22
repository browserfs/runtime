<?php
	
	namespace browserfs\runtime;

	class Validator {

		protected $name = null;
		protected $extends = null;
		protected $extended = false;

		protected $runtime = null;

		protected $rootRules     = null;
		protected $propertyRules = null;

		private   $lastTestedValue = null;

		public function __construct( \browserfs\Runtime $runtime, $validatorName, $extends = null ) {
			
			if ( !is_string( $validatorName ) ) {
				throw new \browserfs\runtime\Exception('Invalid argument: expected string');
			}

			if ( null !== $extends ) {
				if ( !is_string( $extends ) ) {
					throw new \browserfs\runtime\Exception('Invalid argument: expected string | null');
				} else {
					$this->extends = $extends;
				}
			}

			$this->name = $validatorName;
			$this->runtime = $runtime;
		}

		/**
		 * Root conditions are used for primitive data types.
		 */
		public function addRootCondition( $operator, $value, $error = null ) {
			
			if ( $error !== null && !is_string( $error ) ) {
				throw new \browserfs\runtime\Exception('Invalid argument $error: expected string | null');
			}

			if ( !is_string( $operator ) ) {
				throw new \browserfs\runtime\Exception('Invalid argument $operator: expected string' );
			}

			if ( !$this->isValidOperatorValue( $operator, $value ) ) {
				throw new \browserfs\runtime\Exception('Value ' . json_encode( $value ) . ' is not valid for operator ' . json_encode( $operator ) );
			}

			if ( $this->rootRules === null ) {
				$this->rootRules = [];
			}

			$this->rootRules[ $operator ] = [
				'value' => $value,
				'error' => $error
			];
		}

		/**
		 * Property conditions are used for complex data types.
		 */
		public function addPropertyCondition( $propertyName, $operator, $value, $error = null ) {
			
			if ( !is_string( $propertyName ) ) {
				throw new \browserfs\runtime\Exception('Invalid argument $propertyName: expected string');
			}

			if ( !is_string( $operator ) ) {
				throw new \browserfs\runtime\Exception('Invalid argument $operator: expected string' );
			}

			if ( !$this->isValidOperatorValue( $operator, $value ) ) {
				throw new \browserfs\runtime\Exception('Value ' . json_encode( $value ) . ' is not valid for operator ' . json_encode( $operator ) );
			}

			if ( null !== $error && !is_string( $error ) ) {
				throw new \browserfs\runtime\Exception('Invalid argument $error: expected string | null' );
			}

			if ( $this->propertyRules === null ) {
				$this->propertyRules = [];
			}

			if ( !isset( $this->propertyRules[ $propertyName ] ) ) {
				$this->propertyRules[ $propertyName ] = [];
			}

			$this->propertyRules[ $propertyName ][ $operator ] = [
				'value' => $value,
				'error' => $error
			];
		}

		/**
		 * Test to see if a operator argument is a valid one.
		 */
		protected function isValidOperatorValue( $operator, $value ) {
			switch ( $operator ) {
				case 'is':
				case 'isnot':
					return is_float( $value ) || is_string( $value ) || is_int( $value ) || $value === null || is_bool( $value );
					break;
				case 'min':
				case 'max':
					return is_float( $value ) || is_int( $value ) || is_string( $value );
					break;
				case 'match':
					return is_string( $value ) && @preg_match( $value, '' ) !== false;
					break;
				case 'require':

					if ( is_string( $value ) && preg_match( '/^[a-zA-Z_]([a-zA-Z0-9_]+)?$/', $value ) ) {
						return true;
					}

					if ( is_array( $value ) ) {
						foreach ( $value as $val ) {
							if ( !is_string( $val ) || !preg_match( '/^[a-zA-Z_]([a-zA-Z0-9_]+)?$/', $val ) ) {
								return false;
							}
						}

						return true;
					}

					return false;
					break;
				case 'index':
					if ( is_array( $value ) ) {
						foreach ( $value as $item ) {
							if ( !is_array( $item ) || !isset( $item['operator'] ) || !isset( $item['value'] ) || !is_string( $item['operator'] ) ) {
								return false;
							} else {
								if ( !$this->isValidOperatorValue( $item['operator'], $item['value'] ) ) {
									return false;
								}
							}
						}
						return true;
					} else {
						return false;
					}
					break;
				case 'length':
				case 'minlength':
				case 'maxlength':
					return is_int( $value ) && $value >= 0;
					break;
				case 'instanceof':
					if ( is_string( $value ) && strlen( $value ) && preg_match('/^[a-zA-Z_]([a-zA-Z0-9_]+)?$/', $value) ) {
						return true;
					} else {
						return false;
					}
					break;
				case 'oneof':
					if ( is_array( $value ) ) {
						foreach ( $value as $item ) {
							if ( !is_string( $item ) || !preg_match('/^[a-zA-Z_]([a-zA-Z0-9_]+)?$/', $item ) ) {
								return false;
							}
						}
						return count( $value ) > 0;
					} else {
						return false;
					}
					break;
				case 'in':
				case 'nin':
					if ( is_array( $value ) ) {
						return count( $value ) > 0;
					} else {
						return false;
					}
					break;
				default:
					return false;
					break;
			}
		}

		/**
		 * Test if the $mixed argument complies with all the validator rules
		 */
		public function test( $mixed, &$errors = null ) {

			// We extend the validator on first "test" usage, otherwise it has no
			// sense to extend it
			if ( $this->extends !== null && $this->extended === false ) {
				$this->rootRules = $this->getRootRules();
				$this->propertyRules = $this->getPropertyRules();
				$this->extended = true;
			}
				
			if ( func_num_args() == 2 ) {
				$errors = [];
				$showErrors = true;
			} else {
				$showErrors = false;
			}

			$returnValue = true;

			if ( $this->rootRules !== null ) {

				foreach ( $this->rootRules as $operator => $operatorConfig ) {

					if ( !$this->testOperator( $operator, $operatorConfig['value'], $mixed ) ) {
						
						$returnValue = false;
						
						if ( $showErrors ) {
							
							$errors[] = isset( $operatorConfig['error'] ) 
								? $this->getErrorMessage( $operatorConfig['error'] )
								: 'Error testing ' 
									. $operator 
									. '(' 
									. json_encode( $operatorConfig['value'] ) 
									. ') on ' 
									. json_encode( $mixed );
						}
					}

				}

			}

			if ( $this->propertyRules !== null ) {

				if ( !Utils::isComplex( $mixed ) ) {
					
					$returnValue = false;
					
					if ( $showErrors ) {
						$errors[] = 'Provided data is not a complex type ( object | array )';
					}

				} else {

					foreach ( $this->propertyRules as $propertyName => $operators ) {

						if ( Utils::hasProperty( $mixed, $propertyName ) ) {

							foreach ( $operators as $operator => $operatorConfig ) {

								if ( !$this->testOperator( $operator, $operatorConfig['value'], Utils::getProperty( $mixed, $propertyName ) ) ) {
									
									$returnValue = false;

									if ( $showErrors ) {

										$errors[] = isset( $operatorConfig['error'] )
											? '[' . $propertyName . ']: '
											  . $this->getErrorMessage( $operatorConfig['error'] )

											: '[' . $propertyName . ']: '
											  . 'Error testing '
											  . $operator
											  . '('
										  	  . json_encode( $operatorConfig['value'] )
										  	  . ') on '
											  . json_encode( Utils::getProperty( $mixed, $propertyName ) );

									}

								}

							}

						} else {

							$returnValue = false;

							if ( $showErrors ) {
								$errors[] = 'Provided data does not have a property called ' . json_encode( $propertyName );
							}

						}

					}

				}

			}

			return $returnValue;

		}

		/**
		 * Converts the validator to it's representation.
		 */
		public function __toString() {

			$out = [ 'validator ' 
						. $this->name 
						. ( 
							$this->extends !== null 
								? ' extends ' . $this->extends 
								: '' 
						  ) 
						. " {\n" 
					];

			if ( $this->rootRules !== null ) {
				
				$rrules = [];

				foreach ( $this->rootRules as $operator => $operatorData ) {
					$rrules[] = '@' 
								. $operator 
								. ' ' 
								. json_encode( $operatorData['value'] ) 
								. ( 
										$operatorData['error'] !== null 
											? ' => ' . json_encode( $operatorData['error'] ) 
											: '' 
								  );
				}

				if ( count( $rrules ) ) {
					$out[] = "    " . implode( $rrules, ",\n    ") . ";\n";
				}

			}

			if ( $this->propertyRules ) {

				$propNameIndex = 0;

				foreach ( array_keys( $this->propertyRules ) as $prop ) {
					$propNameIndex = max( $propNameIndex, strlen( $prop ) );
				}

				foreach ( $this->propertyRules as $propertyName => $propertyRules ) {

					$rrules = [];

					foreach ( $propertyRules as $operator => $operatorData ) {
					
						$rrules[] = '@' 
								. $operator 
								. ' ' 
								. json_encode( $operatorData['value'] ) 
								. ( 
									$operatorData['error'] !== null 
										? ' => ' . json_encode( $operatorData['error'] ) 
										: '' 
								  );
					}

					if ( count( $rrules ) ) {
					
						$out[] = '    ' 
								. $propertyName 
								. ': ' 
								. str_repeat( ' ', $propNameIndex - strlen( $propertyName ) ) 
								. implode( $rrules, ",\n" . str_repeat( ' ', $propNameIndex + 6 )) 
								. ";\n";
					
					} else {
					
						$out[] = '    ' . $propertyName . ";\n";
					
					}

				}

			}

			$out[] = '}';

			return implode( "\n", $out );

		}

		/**
		 * Operator "min" implementation
		 */
		protected function opMin( $mixed, $value ) {
			
			if ( is_int( $mixed ) || is_float( $mixed ) ) {
				$result = $mixed >= $value;
			} else
			if ( is_string( $mixed ) && is_string( $value ) ) {
				$result = strcmp( $mixed, $value ) >= 0;
			} else
			if ( is_string( $mixed ) && ( is_int( $value ) || is_float( $value ) ) ) {
				$result = (float)$mixed >= $value;
			} else {
				$result = false;
			}

			if ( $result === false ) {
				$this->lastTestedValue = $mixed;
			}

			return $result;
		}

		/**
		 * Operator "max" implementation
		 */
		protected function opMax( $mixed, $value ) {
			if ( is_int( $mixed ) || is_float( $mixed ) ) {
				$result = $mixed <= $value;
			} else
			if ( is_string( $mixed ) && is_string( $value ) ) {
				$result = strcmp( $mixed, $value ) <= 0;
			} else 
			if ( is_string( $mixed ) && ( is_int( $value ) || is_float( $value ) ) ){
				$result = (float)$mixed >= $value;
			} else {
				$result = false;
			}

			if ( $result === false ) {
				$this->lastTestedValue = $mixed;
			}

			return $result;
		}

		/**
		 * Operator "match" implementation
		 */
		protected function opMatch( $mixed, $value ) {
			if ( is_string( $mixed ) ) {
				$result = preg_match( $value, $mixed )
					? true
					: false;
			} else {
				$result = false;
			}

			if ( $result === false ) {
				$this->lastTestedValue = $mixed;
			}

			return $result;
		}

		/**
		 * Operator "require" implementation
		 */
		protected function opRequire( $mixed, $value ) {
			
			if ( is_string( $value ) ) {

				if ( $this->runtime->isValidatorRegistered( $value ) ) {

					$result = $this->runtime->isValidatableBy( $mixed, $value );

				} else {
					throw new \browserfs\runtime\Exception('Validator ' . json_encode( $value ) . ' is not registered ( and is used by a @require operator in validator ' . json_encode( $this->name ) . ').' );
				}

				if ( $result === false ) {
					$this->lastTestedValue = '(in validator ' . $value . ')';
				}

				return $result;

			} else

			if ( is_array( $value ) ) {

				foreach ( $value as $subRequire ) {
					if ( !$this->opRequire( $mixed, $subRequire ) ) {
						return false;
					}
				}

				return true;

			} else {

				return false;

			}
		}

		/**
		 * Operator "index" implementation
		 */
		protected function opIndex( $mixed, $value ) {

			$result = true;
			
			if ( !Utils::isComplex( $mixed ) ) {

				$result = false;

			} else {

				foreach ( Utils::getKeys( $mixed ) as $key ) {

					$val = Utils::getProperty( $mixed, $key );

					if ( is_int( $key ) ) {
						
						$keyValue = $mixed[ $key ];

						foreach ( $value as $rootValidator ) {
							if ( !$this->testOperator( $rootValidator['operator'], $rootValidator['value'], $keyValue ) ) {
								$result = false;
								$this->lastTestedValue = $keyValue;
								break;
							}
						}

						if ( $result === false ) {
							break;
						}

					}
				}
			}

			return $result;

		}

		/**
		 * Operator "is" implementation
		 */
		protected function opIs( $mixed, $value ) {
			$result = $mixed === $value;

			if ( $result === false ) {
				$this->lastTestedValue = $mixed;
			}

			return $result;
		}

		/**
		 * Operator "isnot" implementation
		 */
		protected function opIsNot( $mixed, $value ) {
			$result = $mixed !== $value;

			if ( $result === false ) {
				$this->lastTestedValue = $mixed;
			}

			return $result;
		}

		/**
		 * Operator "instanceof" implementation
		 */
		protected function opInstanceOf( $mixed, $value ) {

			if ( !$this->runtime->isTypeRegistered( $value ) ) {
				$result = false;
			} else {
				$result = $this->runtime->isTypeOf( $mixed, $value, $errors );
			}

			// echo json_encode( $mixed ) . ', is: ', json_encode( $value ), ' ? ', json_encode( $result ), "\n";

			if ( $result === false ) {
				$this->lastTestedValue = $value;
			}

			return $result;
		}

		/**
		 * Operator "length" implementation
		 */
		protected function opLength( $mixed, $value ) {
			
			$store = 'null';

			if ( is_array( $mixed ) ) {
				$result = ( $store = count( $mixed ) ) === $value;
			} else
			if ( is_object( $mixed) ) {
				$result = ( $store = count( get_object_vars( $mixed) ) ) === $value;
			} else
			if ( is_string( $mixed ) ) {
				$result = ( $store = strlen( $mixed ) ) === $value;
			} else {
				$result = false;
			}

			if ( $result === false ) {
				$this->lastTestedValue = $store;
			}

			return $result;
		}

		/**
		 * Operator "minlength" implementation
		 */
		protected function opMinLength( $mixed, $value ) {
			
			$store = 'null';

			if ( is_array( $mixed ) ) {
				$result = ( $store = count( $mixed ) ) >= $value;
			} else
			if ( is_object( $mixed ) ) {
				$result = ( $store = count( get_object_vars( $mixed ) ) ) >= $value;
			} else
			if ( is_string( $mixed ) ) {
				$result = ( $store = strlen( $mixed ) ) >= $value;
			} else {
				$result = false;
			}

			if ( $result === false ) {
				$this->lastTestedValue = $store;
			}

			return $result;
		}

		/**
		 * Operator "minlength" implementation
		 */
		protected function opMaxLength( $mixed, $value ) {
			
			$store = 'null';

			if ( is_array( $mixed ) ) {
				$result = ( $store = count( $mixed ) ) <= $value;
			} else
			if ( is_object( $mixed ) ) {
				$result = ( $store = count( get_object_vars( $mixed) ) ) <= $value;
			} else
			if ( is_string( $mixed ) ) {
				$result = ( $store = strlen( $mixed ) ) <= $value;
			} else {
				$result = false;
			}

			if ( $result === false ) {
				$this->lastTestedValue = $store;
			}

			return $result;
		}

		/**
		 * Operator "oneof" implementation
		 */
		protected function opOneOf( $mixed, $value ) {

			foreach ( $value as $validatorName ) {
				if ( $this->opRequire( $mixed, $validatorName ) ) {
					return true;
				}
			}

			return false;

		}

		/**
		 * Operator "in" implementation
		 */
		protected function opIn( $mixed, $value ) {

			foreach ( $value as $element ) {
				if ( $mixed === $element ) {
					return true;
				}
			}

			$this->lastTestedValue = $mixed;

			return false;

		}

		/**
		 * Operator "nin" ( not in ) implementation
		 */
		protected function opNiN( $mixed, $value ) {

			foreach ( $value as $element ) {
				if ( $mixed === $element ) {
					$this->lastTestedValue = $mixed;
					return false;
				}
			}

			return true;

		}

		/**
		 * Operator wrapper
		 */
		protected function testOperator( $operator, $value, $mixed ) {

			switch ( $operator ) {
				case 'is':
					return $this->opIs( $mixed, $value );
					break;
				case 'isnot':
					return $this->opIsNot( $mixed, $value );
					break;
				case 'min':
					return $this->opMin( $mixed, $value );
					break;
				case 'max':
					return $this->opMax( $mixed, $value );
					break;
				case 'match':
					return $this->opMatch( $mixed, $value );
					break;
				case 'require':
					return $this->opRequire( $mixed, $value );
					break;
				case 'index':
					return $this->opIndex( $mixed, $value );
					break;
				case 'instanceof':
					return $this->opInstanceOf( $mixed, $value );
					break;
				case 'length':
					return $this->opLength( $mixed, $value );
					break;
				case 'minlength':
					return $this->opMinLength( $mixed, $value );
					break;
				case 'maxlength':
					return $this->opMaxLength( $mixed, $value );
					break;
				case 'oneof':
					return $this->opOneOf( $mixed, $value );
					break;
				case 'in':
					return $this->opIn( $mixed, $value );
					break;
				case 'nin':
					return $this->opNiN( $mixed, $value );
					break;
				default:
					throw new \browserfs\runtime\Exception('Unknown operator ' . json_encode( $operator ) );
					break;
			}
		}

		/**
		 * Returns the parsed error message
		 */
		protected function getErrorMessage( $errorMessage ) {

			if ( !is_string( $errorMessage ) ) {
				return $errorMessage;
			}

			return str_replace( '{$value}', trim( json_encode( $this->lastTestedValue), '"'), $errorMessage );

		}

		/**
		 * Returns the root rules defined on "this" validator
		 */
		protected function getRootRules() {
			if ( $this->extends === null ) {
				return $this->rootRules;
			} else {
				return $this->mergeRootRules( $this->runtime->getValidator( $this->extends )->getRootRules(), $this->rootRules );
			}
		}

		/**
		 * Returns the property rules defined on "this" validator
		 */
		protected function getPropertyRules() {
			if ( $this->extends === null ) {
				return $this->propertyRules;
			} else {
				return $this->mergePropertyRules( $this->runtime->getValidator( $this->extends )->getPropertyRules(), $this->propertyRules );
			}
		}

		/**
		 * Merges root rules form a parent validator class to child validator class
		 */
		protected function mergeRootRules( $parentRules, $childRules ) {
			if ( $parentRules === null && $childRules === null ) {
				return null;
			}

			if ( $parentRules === null ) {
				$rules = [];
			} else {
				$rules = $parentRules;
			}

			if ( $childRules !== null ) {
				foreach ( $childRules as $key => $value ) {
					$rules[ $key ] = $value;
				}
			}

			return $rules;
		}

		protected function mergePropertyRules( $parentRules, $childRules ) {
			
			if ( $parentRules === null && $childRules === null ) {
				return null;
			}

			if ( $parentRules === null ) {
				$rules = [];
			} else {
				$rules = $parentRules;
			}

			if ( $childRules !== null ) {

				foreach ( $childRules as $propertyName => $propertyRules ) {
					if ( !isset( $rules[ $propertyName ] ) ) {
						$rules[ $propertyName ] = [];
					}

					foreach ( $propertyRules as $ruleName => $ruleValue ) {
						$rules[ $propertyName ][ $ruleName ] = $ruleValue;
					}
				}

			}

			return $rules;
		}

	}

?>