<?php

	class RuntimeTest extends PHPUnit_Framework_TestCase {

		public function testItShouldParseTestFile() {

			$runtime = \browserfs\Runtime::create([
				__DIR__ . '/../std/builtin.types'
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
				[ false, 'ABCDEFGH', 'CREDIT_CARD' ]
			];

		}

		/**
		 * @dataProvider sampleTestProvider
		 */
		public function testIfAValueIsMatchingABuiltInValidator( $assertValue, $value, $validatorName ) {

			$runtime = \browserfs\Runtime::create([
				__DIR__ . '/../std/builtin.types'
			]);

			$this->assertEquals( $assertValue, $runtime->isValidatableBy( $value, $validatorName ) );

		}

	}

