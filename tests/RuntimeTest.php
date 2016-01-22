<?php

	class RuntimeTest extends PHPUnit_Framework_TestCase {

		protected function setUp() {
			$this->runtime = \browserfs\Runtime::create([
				__DIR__ . '/../std/dummy.types'
			]);
		}

		public function sampleTestProvider() {

			return [
				[ false, 1, 'NUMERIC' ],
				[ true, '1', 'NUMERIC' ],
				[ true, '123.24', 'NUMERIC' ],
				[ true, '-123.23', 'NUMERIC' ],
				[ false, '123.556.12', 'NUMERIC' ],
				[ false, 'localhost', 'IP_ADDRESS' ],
				[ true, '0.0.0.0', 'IP_ADDRESS' ],
				[ false, '127.0.0.256', 'IP_ADDRESS' ],
				[ true, '127.0.0.255', 'IP_ADDRESS' ],
				[ false, '127.0.0.0.1', 'IP_ADDRESS' ],
				[ false, 'mysql://test#', 'URL' ],
				[ true, 'http://www.google.com/?q=23', 'URL' ],
				[ true, 'https://www.google.com', 'URL' ],
				[ true, 'http://www.google.com', 'URL' ],
				[ false, null, 'URL' ],
				[ false, [ 45 ], 'URL' ],
				[ false, 'ABCDEFGH', 'CREDIT_CARD' ],
				[ true, 1, 'ODD_NUMBER' ],
				[ false,2, 'ODD_NUMBER' ],
				[ true, 2, 'EVEN_NUMBER' ],
				[ false, 1, 'EVEN_NUMBER' ],
				[ false, [ 'value' => 1 ], 'VSINT' ],
				[ false, 3, 'VSINT' ],
				[ true,  '2', 'VSINT' ],
				[ false, [ 'value' => 2 ], 'KVSINT' ],
				[ true, json_decode( '{"value": "2"}' ), 'KVSINT' ],
				[ true, [ "value" => "2" ], 'KVSINT' ]
			];

		}

		/**
		 * @dataProvider sampleTestProvider
		 */
		public function testIfAValueIsMatchingABuiltInValidator( $assertValue, $value, $validatorName ) {

			$this->assertEquals( $assertValue, $result = $this->runtime->isValidatableBy( $value, $validatorName, $errors ) );

		}

		public function testIfSuppostitionsAreTrue() {
			$this->assertEquals( true, is_string( "2" ) );
			$this->assertEquals( true, preg_match( '/^(0|(\\-)?[1-9]([0-9]+)?)$/', "2" ) ? true : false );
		}

	}

