<?php

	namespace browserfs\runtime\Type;

	/**
	 * String representing an float value
	 */

	class SFloat extends \browserfs\runtime\Type {
		
		public function test( $mixed, &$errors = null ) {
			return is_string( $mixed ) && preg_match( '/^(0|(\\-)?[1-9]([0-9]+)?)\\.[0-9]+$/', $mixed )
				? true
				: false;
		}

	}

?>