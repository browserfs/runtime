<?php

	namespace browserfs\runtime\Type;

	class Any extends \browserfs\runtime\Type {
		
		public function test( $mixed, &$errors = null ) {
			return true;
		}

	}

?>