<?php

	namespace browserfs\runtime;

	/**
	 * Some helpers, for object / arrays manipulation.
	 */
	class Utils {

		/**
		 * Test if @mixed is array or object ( in other words if it has keys / properties )
		 * @return boolean
		 */
		public static function isComplex( $mixed ) {
			return is_array( $mixed ) || is_object( $mixed );
		}


		/**
		 * Returns the keys of an array or object.
		 * @return string[]
		 */
		public static function getKeys( $mixed ) {
			return is_array( $mixed )
				? array_keys( $mixed )
				: ( is_object( $mixed )
					? array_keys( get_object_vars( $mixed ) )
					: [] );
		}

		/**
		 * Return the value of a property or of a key from an object / array
		 * @param $mixed - object | array
		 * @return any | null if key does not exist
		 */
		public static function getProperty( $mixed, $propertyName ) {
			return is_array( $mixed )
				? $mixed[ $propertyName ]
				: ( is_object( $mixed )
					? $mixed->{$propertyName}
					: null );
		}

		/**
		 * Returns true if $mixed has key or property called $propertyName,
		 * and false otherwise
		 * @return boolean
		 */
		public static function hasProperty( $mixed, $propertyName ) {
			return is_array( $mixed )
				? isset( $mixed[ $propertyName ] )
				: is_object( $mixed )
					? isset( $mixed->{$propertyName} )
					: false;
		}

	}

?>