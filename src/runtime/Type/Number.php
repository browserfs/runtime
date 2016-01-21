<?php

	namespace browserfs\runtime\Type;

	class Number extends \browserfs\runtime\Type {
		
		public function test( $mixed ) {
			return is_int( $mixed ) || is_float( $mixed );
		}
		
	}

?>