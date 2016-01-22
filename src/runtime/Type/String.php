<?php

	namespace browserfs\runtime\Type;

	class String extends \browserfs\runtime\Type {
		
		public function test( $mixed, &$errors = null ) {
			return is_string( $mixed );
		}
		
	}

?>