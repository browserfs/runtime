<?php

	namespace browserfs\runtime\Type;

	class Float extends \browserfs\runtime\Type {
		
		public function test( $mixed ) {
			return is_float( $mixed );
		}

	}

?>