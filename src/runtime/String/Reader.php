<?php

	/**
	 * Class used to parse ".ts" files
	 */
	
	namespace browserfs\runtime\String;

	class Reader extends \browserfs\string\Parser {

		protected static $tokens = [
			'WHITESPACE'    	 	=> '/^([\s]+)/',
			'COMMENT'              	=> '/^(\/\/[^\n\r]+|\/\*[\s\S\r\n]+?\*\/)/',
			
			'TOK_TYPE' 		        => '/^type(\s|\/)/',
			'TOK_VALIDATOR'         => '/^validator(\s|\/)/',

			'TOK_EXTENDS' 			=> '/^extends(\s|\/)/',

			'TOK_VARIABLE_NAME' 	=> '/^[a-zA-Z_]([a-zA-Z0-9_]+)?/',
			
			'TOK_BLOCK_BEGIN' 		=> '/^\{/',
			'TOK_BLOCK_END' 		=> '/^\}/',
			'TOK_SQBRACKET_BEGIN' 	=> '/^\[/',
			'TOK_SQBRACKET_END' 	=> '/^\]/',
			'TOK_RBRACKET_BEGIN'    => '/^\(/',
			'TOK_RBRACKET_END'      => '/^\)/',
			'TOK_QUESTION' 			=> '/^\?/',
			'TOK_DOUBLEDOT' 		=> '/^\:/',
			'TOK_SEMICOLON' 		=> '/^;/',

			'TOK_VALIDATOR_PROPERTY' => '/^@[a-zA-Z_]([a-zA-Z0-9_]+)?/',
			'TOK_VALIDATOR_PTR'     => '/^=>/',
			'TOK_NUMBER'            => '/^(\-)?[\d]+(\.[\d]+)?/',
			'TOK_STRING'            => '/^("(?:[^"\\\\]|\\\\.)*"|\'(?:[^\'\\\\]|\\\\.)*\')/',
			'TOK_BOOLEAN'           => '/^(true|false)/',
			'TOK_NULL'              => '/^null/',
			'TOK_COMMA'             => '/^,/',
		];

		protected $runtime = null;

		public function __construct( $buffer, \browserfs\Runtime $runtime ) {
			
			parent::__construct( $buffer );
			
			$this->runtime = $runtime;
			$this->parse();
		}

		/**
		 * If the $reader can read token $tokName, consumes it's content and
		 * returns true. Otherwise, returns false.
		 */
		protected static function read( $tokName, \browserfs\string\Parser $reader ) {
			
			if ( !is_string( $tokName ) ) {
				throw new \browserfs\runtime\Exception('Invalid argument $tokName: expected string');
			}

			if ( array_key_exists( $tokName, self::$tokens ) ) {

				$consume = null;

				switch ( $tokName ) {
					case 'TOK_TYPE':
						$consume = 4;
						break;
					case 'TOK_VALIDATOR':
						$consume = 9;
						break;
					case 'TOK_EXTENDS':
						$consume = 7;
					default:
						break;

				}

				$matches = $reader->canReadExpression( self::$tokens[ $tokName ] );
				
				if ( $matches ) {
					$reader->consume( $consume === null ? strlen( $matches[0] ) : $consume );
					return true;
				} else {
					return false;
				}
			
			} else {
				throw new \browserfs\runtime\Exception('Unknown parser token name: ' . $tokName );
			}

		}

		/**
		 * If the $reader can read token $tokName, returns it's contents, otherwise
		 * returns false.
		 */
		protected static function readString( $tokName, \browserfs\string\Parser $reader ) {
			
			if ( !is_string( $tokName ) ) {
				throw new \browserfs\runtime\Exception('Invalid argument $tokName: expected string');
			}

			if ( array_key_exists( $tokName, self::$tokens ) ) {

				$matches = $reader->canReadExpression( self::$tokens[ $tokName ] );
				
				if ( $matches ) {
					$reader->consume( strlen( $matches[0] ) );
					return $matches[0];
				} else {
					return false;
				}
			
			} else {
				throw new \browserfs\runtime\Exception('Unknown parser token name: ' . $tokName );
			}

		}

		/**
		 * Reads any successive white spaces or comments. Returns true if at least one whitespace
		 * or one comment was read.
		 */
		protected static function readWhiteSpaceOrComment( \browserfs\string\Parser $reader ) {
			if ( $reader->eof() ) {
				return false;
			}

			$matches = 0;

			do {

				$result = false;

				if ( self::read( 'WHITESPACE', $reader ) ) {
					$result = true;
					$matches++;
					continue;
				}

				if ( self::read( 'COMMENT', $reader ) ) {
					$result = true;
					$matches++;
					continue;
				}

				if ( $reader->eof() ) {
					$result = true;
				}

			} while ( $result == true );

			return $matches > 0;

		}

		/**
		 * Reads a type property
		 */
		protected static function readTypeProperty( \browserfs\string\Parser $reader, \browserfs\runtime\Type $type, $readSemiColon = TRUE ) {

			// optionally white space
			self::readWhiteSpaceOrComment( $reader );

			$returnValue = [
				'isIndex'   => false,
				'indexType' => false,
				'name'      => false,
				'optional'  => false,
				'type'      => false
			];

			if ( self::read( 'TOK_SQBRACKET_BEGIN', $reader ) ) {

				$returnValue[ 'indexType' ] = self::readTypeProperty( $reader, $type, FALSE );

				if ( $returnValue[ 'optional' ] ) {
					throw new \browserfs\runtime\Exception('Indexes cannot be optional, at line ' . $reader->line() );
				}

				$returnValue[ 'isIndex' ] = true;

				self::readWhiteSpaceOrComment( $reader );

				if ( !self::read( 'TOK_SQBRACKET_END', $reader ) ) {
					throw new \browserfs\runtime\Exception('Unexpected token ' . json_encode( $reader->nextToken() ) . ', expected "]", at line ' . $reader->line() );
				}

			} else {

				// propertyName
				$returnValue['name'] = self::readString( 'TOK_VARIABLE_NAME', $reader );

				if ( $returnValue['name'] === false ) {
					throw new \browserfs\runtime\Exception( 'Unexpected token ' . json_encode( $reader->nextToken() ) . ', expected key name, at line ' . $reader->line() );
				}

				$returnValue['optional'] = self::read( 'TOK_QUESTION', $reader );

				// optionally white space

				self::readWhiteSpaceOrComment( $reader );

			}

			// read ':'

			if ( !self::read( 'TOK_DOUBLEDOT', $reader ) ) {
				throw new \browserfs\runtime\Exception('Unexpected token ' . json_encode( $reader->nextToken() ) . ', expected ":", at line ' . $reader->line() );
			}

			// optionally white space
			self::readWhiteSpaceOrComment( $reader );

			if ( $returnValue['type'] = self::readString( 'TOK_VARIABLE_NAME', $reader ) ) {

				// test if array of
				if ( self::read( 'TOK_SQBRACKET_BEGIN', $reader ) ) {

					if ( !self::read( 'TOK_SQBRACKET_END', $reader ) ) {
						throw new \browserfs\runtime\Exception('Unexpected token ' . json_encode( $reader->nextToken() ) . ', expected "]", at line ' . $reader->line() );
					}
					
					$returnValue['type'] .= '[]';
				}

			} else {

				throw new \browserfs\runtime\Exception('Unexpected token ' . json_encode( $reader->nextToken() ) . ', expected TYPE_DEF, at line ' . $reader->line() );

			}

			// read optionally white space
			self::readWhiteSpaceOrComment( $reader );

			if ( $readSemiColon ) {
				if ( !self::read( 'TOK_SEMICOLON', $reader ) ) {
					throw new \browserfs\runtime\Exception('Unexpected token ' . json_encode( $reader->nextToken() ) . ', expected ";", at line ' . $reader->line() );
				}
			}

			return $returnValue;

		}

		protected function parseType() {

			// we allready parsed the "type" token.

			if ( !self::readWhiteSpaceOrComment( $this ) ) {
				throw new \browserfs\runtime\Exception('Unexpected token ' . json_encode( $this->nextToken() ) . ' at line: ' . $this->line() );
			}

			$typeName = self::readString( 'TOK_VARIABLE_NAME', $this );

			if ( $typeName === false ) {
				throw new \browserfs\runtime\Exception('Unexpected token ' . json_encode( $this->nextToken() ) . ', expected type name, at line: ' . $this->line() );
			}

			$typeExtends = null;

			self::readWhiteSpaceOrComment( $this );

			if ( self::read( 'TOK_EXTENDS', $this ) ) {

				self::readWhiteSpaceOrComment( $this );

				$typeExtends = self::readString( 'TOK_VARIABLE_NAME', $this );

				if ( $typeExtends === false ) {
					throw new \browserfs\runtime\Exception('Unexpected token ' . json_encode( $this->nextToken() ) . ', expected extended type name, at line: ' . $this->line() );
				}

			}

			$returnValue = $this->runtime->addType( $typeName, $typeExtends );

			// optionally read a white space or comment
			self::readWhiteSpaceOrComment( $this );

			if ( !self::read( 'TOK_BLOCK_BEGIN', $this ) ) {
				throw new \browserfs\runtime\Exception( 'Unexpected token ' . json_encode( $this->nextToken() ) . ', expected "{", at line: ' . $this->line() );
			}

			do {
				
				self::readWhiteSpaceOrComment( $this );

				if ( $this->canReadExpression( self::$tokens['TOK_BLOCK_END'] ) ) {
					break;
				}

				$property = self::readTypeProperty( $this, $returnValue );

				if ( $property['isIndex'] ) {

					$returnValue->addIndex( $property[ 'indexType' ][ 'type' ], [
						'type' => $property['type'],
						'optional' => $property[ 'optional' ]
					] );

				} else {

					$returnValue->addProperty( $property[ 'name' ], [
						'type' => $property['type'],
						'optional' => $property['optional']
					] );

				}

			} while ( $property );

			if ( !self::read( 'TOK_BLOCK_END', $this ) ) {
				throw new \browserfs\runtime\Exception('Unexpected token ' . json_encode( $this->nextToken() ) . ', expected "}", at line: ' . $this->line() . ', buffer: ' . json_encode( $this . '' ) );
			}

			return $returnValue;

		}

		protected static function readInlineValue( \browserfs\string\Parser $reader ) {

			// try read int

			$value = self::readString( 'TOK_NUMBER', $reader );

			if ( $value !== false ) {
				return strpos( $value, '.' ) !== false
					? (float)$value
					: (int)$value;
			}

			// try read string
			$value = self::readString( 'TOK_STRING', $reader );

			if ( $value !== false ) {
				
				$value = substr( $value, 1, strlen( $value ) - 2 );
				$result = '';

				for ( $i=0, $len = strlen( $value ); $i<$len; $i++ ) {

					// handle "esc" char
					if ( $value[$i] == '\\' ) {

						if ( $i < $len - 1 ) {
							
							switch ( $value[$i + 1 ] ) {
								case 'n':
									$result .= "\n";
									break;
								case 'r':
									$result .= "\r";
									break;
								case '\t':
									$result .= "\t";
									break;
								default:
									$result .= $value[$i + 1];
									break;
							}

							$i++;

						} else {

							$result .= $value[$i];

						}

					} else {

						$result .= $value[$i];

					}

				}

				return $result;
			}

			// try read boolean

			$value = self::readString('TOK_BOOLEAN', $reader );

			if ( $value !== false ) {
				return $value === 'true'
					? true
					: false;
			}

			return null;

		}

		protected static function readEnumValues( \browserfs\string\Parser $reader ) {

			self::readWhiteSpaceOrComment( $reader );

			if ( !self::read( 'TOK_RBRACKET_BEGIN', $reader ) ) {
				throw new \browserfs\runtime\Exception('Unexpected token ' . $reader->nextToken() . ', expected "(", at line ' . $reader->line() );
			}

			$result = [];

			do {
				
				$next = false;

				self::readWhiteSpaceOrComment( $reader );

				if ( $item = self::readString( 'TOK_VARIABLE_NAME', $reader ) ) {

					$result[] = $item;

					self::readWhiteSpaceOrComment( $reader );

					if ( self::read('TOK_COMMA', $reader ) ) {
						$next = true;
					}

				}

			} while ( $next );

			self::readWhiteSpaceOrComment( $reader );

			if ( !self::read('TOK_RBRACKET_END', $reader ) ) {
				throw new \browserfs\runtime\Exception('Unexpected token ' . $reader->nextToken() . ', expected ")", at line ' . $reader->line() );
			}

			return $result;

		}

		protected static function getValidatorPropertyRules( \browserfs\string\Parser $reader, $endOfEnumerationToken = 'TOK_SEMICOLON' ) {
			
			$rules = [];

			do {

				$operator = self::readString( 'TOK_VALIDATOR_PROPERTY', $reader );

				if ( $operator === false ) {
					throw new \browserfs\runtime\Exception('Unexpected token ' . $reader->nextToken() . ', expected validator operator, on line ' . $reader->line() );
				}

				$operator = substr( $operator, 1 );

				// optionally white space or comment
				self::readWhiteSpaceOrComment( $reader );

				switch ( $operator ) {
					case 'index':

						$value = null;

						if ( !self::read( 'TOK_SQBRACKET_BEGIN', $reader ) ) {
							throw new \browserfs\runtime\Exception('Unexpected token ' . $reader->nextToken() . ', expected "[", on line ' . $reader->line() );
						}

						// optional white space
						self::readWhiteSpaceOrComment( $reader );

						$value = self::getValidatorPropertyRules( $reader, 'TOK_SQBRACKET_END' );

						break;

					case 'instanceof':

						$value = self::readString( 'TOK_VARIABLE_NAME', $reader );

						break;

					case 'oneof':

						$value = self::readEnumValues( $reader );
						break;

					case 'require':

						// if we can read a "(", means we're intending to use multiple requirements.
						// otherwise we're reading a single require

						if ( $reader->canReadString('(') ) {
							
							$value = self::readEnumValues( $reader );

						} else {
							
							$value = self::readString('TOK_VARIABLE_NAME', $reader );

							if ( $value === null ) {
								throw new \browserfs\runtime\Exception('Unexpected token ' . json_encode($reader->nextToken()) . ', expected validator name or list of validators, on line ' . $reader->line() );
							}

						}

						break;

					default:
						$value = self::readInlineValue( $reader );
						break;

				}

				if ( $value === null ) {
					throw new \browserfs\runtime\Exception('Unexpected token ' . $reader->nextToken() . ', expected <value>, at line ' . $reader->line() );
				}

				// optionally white space or comment
				self::readWhiteSpaceOrComment( $reader );

				if ( self::read( 'TOK_VALIDATOR_PTR', $reader ) ) {
					
					// optionally white space or comment
					self::readWhiteSpaceOrComment( $reader );

					// followed by optionally error
					$error = self::readInlineValue( $reader );

					if ( $error !== null ) {
						self::readWhiteSpaceOrComment( $reader );
					}

				} else {

					$error = null;
				
				}


				$readNext = self::read( 'TOK_COMMA', $reader );

				if ( $readNext === false ) {

					// is followed by end of instruction?

					if ( self::read( $endOfEnumerationToken, $reader ) === false ) {
						throw new \browserfs\runtime\Exception('Unexpected token ' . $reader->nextToken() . ', expected <' . $endOfEnumerationToken . '> or ",", at line ' . $reader->line() );
					} else {
						self::readWhiteSpaceOrComment( $reader );
					}

				}

				if ( $reader->eof() ) {
					throw new \browserfs\runtime\Exception('Unexpected end of buffer, @ line ' . $reader->line() );
				}

				$rules[] = [
					'operator' => $operator,
					'value'    => $value,
					'error'    => $error
				];

				if ( $readNext ) {
					self::readWhiteSpaceOrComment( $reader );
				}

			} while ( $readNext );

			return $rules;

		}

		/**
		 * Reads a type property
		 */
		protected static function readValidatorProperty( \browserfs\string\Parser $reader, \browserfs\runtime\Validator $validator ) {

			// optionally white space
			self::readWhiteSpaceOrComment( $reader );

			if ( $reader->canReadString('@') ) {
				
				$rules = self::getValidatorPropertyRules( $reader );

				try {

					foreach ( $rules as $rule ) {
						$validator->addRootCondition( $rule['operator'], $rule['value'], $rule['error'] );
					}

				} catch ( \browserfs\runtime\Exception $e ) {
					throw new \browserfs\runtime\Exception('Parser error, at line ' . $reader->line() . ': ' . $e->getMessage(), 1, $e );
				}


			} else {

				// read property name
				$propertyName = self::readString( 'TOK_VARIABLE_NAME', $reader );

				if ( $propertyName === false ) {
					throw new \browserfs\runtime\Exception('Unexpected token ' . $reader->nextToken() . ', expected <operator> or <property>, at line ' . $reader->line() );
				}

				// read optionally white space or comment
				self::readWhiteSpaceOrComment( $reader );

				if ( !self::read('TOK_DOUBLEDOT', $reader ) ) {
					throw new \browserfs\runtime\Exception('Unexpected token ' . $reader->nextToken() . ', expected ":", at line ' . $reader->line() );
				}

				self::readWhiteSpaceOrComment( $reader );

				$rules = self::getValidatorPropertyRules( $reader );

				try {
					foreach ( $rules as $rule ) {
						$validator->addPropertyCondition( $propertyName, $rule['operator'], $rule['value'], $rule['error'] );
					}
				} catch ( \browserfs\runtime\Exception $e ) {
					throw new \browserfs\runtime\Exception('Parser error, at line ' . $reader->line() . ': ' . $e->getMessage(), 1, $e );
				}

			}

			return $validator;

		}

		protected function parseValidator() {

			if ( !self::readWhiteSpaceOrComment( $this ) ) {
				throw new \browserfs\runtime\Exception('Unexpected token ' . json_encode( $this->nextToken() ) . ' at line: ' . $this->line() );
			}

			$validatorName = self::readString( 'TOK_VARIABLE_NAME', $this );

			$validatorExtends = null;

			self::readWhiteSpaceOrComment( $this );

			if ( self::read( 'TOK_EXTENDS', $this ) ) {

				self::readWhiteSpaceOrComment( $this );
			
				$validatorExtends = self::readString( 'TOK_VARIABLE_NAME', $this );

				if ( $validatorExtends === false ) {
					throw new \browserfs\runtime\Exception('Unexpected token ' . json_encode( $this->nextToken() ) . ', expected extended validator name, at line: ' . $this->line() );
				}
			}

			$returnValue = $this->runtime->addValidator( $validatorName, $validatorExtends );

			// optionally read a white space or comment
			self::readWhiteSpaceOrComment( $this );

			if ( !self::read( 'TOK_BLOCK_BEGIN', $this ) ) {
				throw new \browserfs\runtime\Exception( 'Unexpected token ' . json_encode( $this->nextToken() ) . ', expected "{", at line: ' . $this->line() );
			}

			do {
				
				self::readWhiteSpaceOrComment( $this );

				if ( $this->canReadExpression( self::$tokens['TOK_BLOCK_END'] ) ) {
					break;
				}

				$rule = self::readValidatorProperty( $this, $returnValue );

			} while ( $rule );

			if ( !self::read( 'TOK_BLOCK_END', $this ) ) {
				throw new \browserfs\runtime\Exception('Unexpected token ' . json_encode( $this->nextToken() ) . ', expected "}", at line: ' . $this->line() . ', buffer: ' . json_encode( $this . '' ) );
			}

			return $returnValue;

		}

		public function parse() {

			while ( !$this->eof() ) {

				switch ( true ) {
					case self::read( 'WHITESPACE', $this ):
					case self::read( 'COMMENT', $this ):
						break;

					case self::read( 'TOK_TYPE', $this ):
						$result = $this->parseType();
						break;

					case self::read( 'TOK_VALIDATOR', $this ):
						$result = $this->parseValidator();
						break;

					default:
						throw new \browserfs\runtime\Exception("Unknown token " . json_encode( $this->nextToken() ) . ' at line: ' . $this->line() );
						break;
				}
			}
		}

	}

?>