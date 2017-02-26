<?php

	namespace browserfs\runtime\Type;

	class Integer extends \browserfs\runtime\Type {
		
		public function test( $mixed, &$errors = null ) {
			return is_int( $mixed );
		}

	}

?>