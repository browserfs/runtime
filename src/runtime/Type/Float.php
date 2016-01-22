<?php

	namespace browserfs\runtime\Type;

	class Float extends \browserfs\runtime\Type {
		
		public function test( $mixed, &$errors = null ) {
			return is_float( $mixed );
		}

	}

?>