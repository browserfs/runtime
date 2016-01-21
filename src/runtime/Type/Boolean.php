<?php

	namespace browserfs\runtime\Type;

	class Boolean extends \browserfs\runtime\Type {
		
		public function test( $mixed ) {
			return $mixed === true || $mixed === false;
		}

	}

?>