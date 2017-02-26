<?php

	namespace browserfs\runtime\Type;

	use browserfs\runtime\Type;

	class Varchar extends Type {
		
		public function test( $mixed, &$errors = null ) {
			return is_string( $mixed );
		}
		
	}

?>