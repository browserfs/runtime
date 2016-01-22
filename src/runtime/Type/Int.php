<?php

	namespace browserfs\runtime\Type;

	class Int extends \browserfs\runtime\Type {
		
		public function test( $mixed, &$errors = null ) {
			return is_int( $mixed );
		}

	}

?>