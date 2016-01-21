<?php

	namespace browserfs\runtime\Type;

	class String extends \browserfs\runtime\Type {
		
		public function test( $mixed ) {
			return is_string( $mixed );
		}
		
	}

?>