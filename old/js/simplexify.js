/*jslint browser:true */

(function () {
    'use strict';

	// The object to expose
	var Simplexify = Function.prototype;

	// Removes extra spaces
	String.prototype.trim = function () {
		return this.replace(/^\s+|\s+$/g, "").replace(/\s{2,}/g, " ");
	};
	
	// Returns a unique array
	var unique = function (arr) {
		var result = [],
			hash = {},
			i,
			len;
		for (i = 0, len = arr.length; i < len; i += 1) {
			if (!hash[arr[i]]) {
				result.push(arr[i]);
				hash[arr[i]] = 1;
			}
		}
		return result;
	};

	// Converts array to hash
	var toHash = function (arr) {
		var obj = {},
			i,
			len;
		for (i = 0, len = arr.length; i < len; i += 1) {
			obj[arr[i]] = 1;
		}
		return obj;
	};

	// Check if object is same
	var same = function (obj1, obj2) {
		var a,
			b,
			prop;
		if (obj1 === obj2) {
			return true;
		}
		if (!(obj1 instanceof obj2.constructor)) {
			return false;
		}
		for (prop in obj1) {
			if (!obj1.hasOwnProperty(prop)) {
				continue;
			}
			a = obj1[prop];
			b = obj2[prop];
			if (typeof a === "object") {
				if (typeof a !== typeof b) {
					return false;
				}
				if (!same(a, b)) {
					return false;
				}
			} else {
				if (a.toString() !== b.toString()) {
					return false;
				}
			}
		}
		return true;
	};

	var sortArrayWithSubsetAtEnd = function (arr, subset) {
		var list = [],
			hash = toHash(subset),
			i,
			len;
		if (!subset || typeof subset !== "object") {
			return [];
		}
		for (i = 0, len = arr.length; i < len; i++) {
			if (!hash[arr[i]]) {
				list.push(arr[i]);
			}
		}
		return list.sort().concat(subset.sort());
	};
	
	
	
	
	/**
	 *
	 * Constraint Object
	 *
	 */
	
	
	
	/**
	 * Create a Constraint Object.
	 * Goals for the Constraint Object:
	 * - Convert String to Object such that the terms, constants and sign and be easily accessed.
	 * - Allow for terms to be moved from one side to the other.
	 * - The standard will be (variables, ...) (comparison) (constants)
	 */
	var Constraint = function () {
		this.comparison = "";
		this.leftSide = {};
		this.rightSide = {};
		this.specialTerms = {};
		return this;
	};
	/**
	 * Used to convert strict inequalities to non-strict.
	 */
	Constraint.EPSILON = 1e-6;
	/**
	 * Checks to see if an object equals the current instance of Constraint.
	 */
	Constraint.equals = function (obj) {
		return same(this,obj);
	};
	/**
	 * Checks to see if a string has more than one of these symbols; ">", "<", ">=", "<=", "=".
	 */
	Constraint.hasManyCompares = function (str) {
		return 1 < (str.replace(/\s/g, "").match(/[<>]=?|=/g) || []).length;
	};
	/**
	 * Checks to see if a string doesn't have a left and right terms with each addition and subtraction operation.
	 */
	Constraint.hasIncompleteBinaryOperator = function (str) {
		return /[+\-][><=+\-]|[><=+\-]$/.test(str.replace(/\s/g, "")) || /[^+\-><=]\s+[^+\-><=]/.test(str.replace(/\s{2,}/g, ""));
	};
	/**
	 * Checks to see if string comply with standards.
	 */
	Constraint.validate = function (str) {
		if (Constraint.hasManyCompares(str)) {
			throw new Error("Only 1 comparison (<,>,=, >=, <=) is allowed in a Constraint.");
		}
		if (Constraint.hasIncompleteBinaryOperator(str)) {
			throw new Error("Math operators must be in between terms. Good:(a+b=c). Bad:(a b+=c)");
		}
	};
	/**
	 * For all the term types in sideA, move them over to sideB using the provided function.
	 */
	Constraint.switchSides = function (sideA, sideB, forEachTermFunc) {
		forEachTermFunc.call(sideA, function (name, value) {
			sideB.addTerm(name, -value);
			sideA.removeTerm(name);
		});
	};
	/**
	 * Returns an array of variables without the coefficients.
	 */
	Constraint.prototype.getTermNames = function (excludeNumbers) {
		return unique(([].concat(this.leftSide.getTermNames(excludeNumbers), this.rightSide.getTermNames(excludeNumbers))));
	};
	/**
	 * Converts a string to an Constraint object literal.
	 */
	Constraint.parseToObject = function (str) {
		str = str.replace(/([><])(\s+)(=)/g, "$1$3");
		Constraint.validate(str);
		var RE_comparison = /[><]=?|=/,
			arr = ("" + str).split(RE_comparison),
			obj = {
				rhs : Expression.parse("0"),
				comparison : "=",
				lhs : Expression.parse(arr[0])
			};
		if (1 < arr.length) {
			obj.rhs = Expression.parse(arr[1]);
			obj.comparison = "" + RE_comparison.exec(str);
		}
		return obj;
	};
	/**
	 * Converts a string to an Constraint Object.
	 */
	Constraint.parse = function (str) {
		var obj = Constraint.parseToObject(str),
			e;
		if (obj) {
			e = new Constraint();
			e.comparison = obj.comparison;
			e.leftSide = obj.lhs;
			e.rightSide = obj.rhs;
		}
		return e;
	};
	/**
	 * Returns a string representation of the Constraint Object.
	 */
	Constraint.prototype.toString = function () {
		return [this.leftSide, this.comparison, this.rightSide].join(" ");
	};
	/**
	 * Return an object that represents the sides left to right or vice versa.
	 */
	Constraint.prototype.getSwappedSides = function (doSwap) {
		return {
			a : (doSwap ? this.rightSide	: this.leftSide),
			b : (doSwap ? this.leftSide		: this.rightSide)
		};
	};
	/**
	 * Designates which side the variables and numbers should be located at.
	 */
	Constraint.prototype.moveTypeToOneSide = function (varSide, numSide) {
		var varSides,
			numSides;
		if (/left|right/.test(varSide)) {
			varSides = this.getSwappedSides(/left/.test(varSide));
			Constraint.switchSides(varSides.a, varSides.b, varSides.a.forEachVariable);
		}
		if (/left|right/.test(numSide)) {
			numSides = this.getSwappedSides(/left/.test(numSide));
			Constraint.switchSides(numSides.a, numSides.b, numSides.a.forEachConstant);
		}
		return this;
	};
	/**
	 * Multiplies the constraint by -1
	 */
	Constraint.prototype.inverse = function () {
		var oppositeCompare = {
			"=" : "=",
			">=" : "<",
			">" : "<=",
			"<=" : ">",
			"<" : ">="
		};
		if (oppositeCompare[this.comparison]) {
			this.comparison = oppositeCompare[this.comparison];
			this.leftSide.inverse();
			this.rightSide.inverse();
		}
		return this;
	};
	/**
	 * Changes the strict relationship from "<" or ">" to "<=" and ">=" correspondingly.
	 */
	Constraint.prototype.removeStrictInequality = function () {
		var eps;
		if (/^[<>]$/.test(this.comparison)) {
			eps = Constraint.EPSILON * (">" === this.comparison ? 1 : -1);
			this.rightSide.addTerm("1", eps);
			this.comparison += "=";
		}
		return this;
	};
	/**
	 * Places the constants on the right and the variables on the left hand side.
	 */
	Constraint.prototype.normalize = function () {
		this.moveTypeToOneSide("left", "right");
		if (this.rightSide.getTermValue("1") < 0) {
			this.inverse();
		}
		return this.removeStrictInequality();
	};
	/**
	 * Adds a new slack variable to the constraint.
	 * Note: A constraint can only contain one slack variable.
	 */
	Constraint.prototype.addSlack = function (val) {
		this.setSpecialTerm({
			key		: "slack",
			name	: "slack",
			value	: val
		});
		return this;
	};
	/**
	 * Sets the value of a special term to the left side of constraint and on the constraint object itself.
	 */
	Constraint.prototype.setSpecialTerm = function (obj) {
		if (!obj || typeof obj !== "object" || !obj.name || !obj.key) {
			return this;
		}
		this.specialTerms[obj.key] = this.specialTerms[obj.key] || {};
		var oldName = this.specialTerms[obj.key].name;
		if (oldName) {
			if (typeof obj.value === "undefined") {
				// get old value
				obj.value = this.leftSide.getTermValue(oldName);
			}
			// remove old value
			this.leftSide.removeTerm(oldName);
		}
		this.specialTerms[obj.key].name = obj.name;
		this.leftSide.setTerm(this.specialTerms[obj.key].name, +obj.value);
		return this;
	};
	/**
	 * Adds a new artificial variable to the constraint.
	 * Note: A constraint can only contain one artificial variable.
	 */
	Constraint.prototype.addartificialVariable = function (val) {
		this.setSpecialTerm({
			key : "artificial",
			name : "artificial",
			value : val
		});
		return this;
	};
	/**
	 * Returns if a special term
	 */
	Constraint.prototype.hasSpecialTerm = function (name) {
		return !!this.specialTerms[name];
	};
	/**
	 * Renames the slack variable
	 */
	Constraint.prototype.renameSlack = function (name) {
		this.setSpecialTerm({
			key : "slack",
			name : name
		});
		return this;
	};
	/**
	 * Renames the artificial variable
	 */
	Constraint.prototype.renameArtificial = function (name) {
		this.setSpecialTerm({
			key : "artificial",
			name : name
		});
		return this;
	};
	/**
	 * Converts a constraint to standard maximization form
	 */
	Constraint.prototype.convertToEquation = function () {
		this.normalize();
		switch (this.comparison) {
			case "<=":
				this.addSlack(1);
				break;
			case ">=":
				this.addSlack(-1);
				this.addArtificialVariable(1);
				break;
		}
		this.comparison = "=";
		return this;
	};
	/**
	 * Returns
	 */
	Constraint.prototype.getSpecialTermNames = function () {
		var names = [];
		for (var prop in this.specialTerms) {
			if (this.specialTerms.hasOwnProperty(prop) && this.specialTerms[prop]) {
				names.push(this.specialTerms[prop].name);
			}
		}
		return names.length ? names : null;
	};
	
	Constraint.prototype.getSpecialTermValue = function (name) {
		var obj = this.specialTerms[name];
		if (!obj) {
			return null;
		}
		return this.getCoefficients([obj.name])[0];
	};
	
	Constraint.prototype.getArtificialName = function () {
		var obj = this.specialTerms.artificial;
		if (!obj) {
			return null;
		}
		return obj.name;
	};
	
	/**
	 * Multiplies the left and right side of a constraint by a factor
	 */
	Constraint.prototype.scale = function (factor) {
		this.leftSide.scale(factor);
		this.rightSide.scale(factor);
		return this;
	};
	
	/**
	 * Moves a variable to the left or right side of a comparison
	 */
	Constraint.prototype.varSwitchSide = function (name, moveTo) {
		if (!/left|right/.test(moveTo)) {
			return this;
		}
		name = (isNaN(name)) ? name : "1";
		var sideA = ("left" === moveTo) ? this.rightSide : this.leftSide,
			sideB = ("left" !== moveTo) ? this.rightSide : this.leftSide;
		
		if (sideA.hasTerm(name)) {
			sideB.addTerm(name, -sideA.getTermValue(name));
			sideA.removeTerm(name);
		}
		
		return this;
	};
	/**
	 * Returns an list of coefficients of terms.
	 */
	Constraint.prototype.getCoefficients = function (termNames) {
		if (!termNames) {
			return null;
		}
		var arr = new Array(termNames.length),
			val,
			i = arr.length;
		// Note: a term should only be on one side after normalized.
		while (i--) {
			val = this.leftSide.getTermValue(termNames[i]);
			if (val === undefined) {
				val = this.rightSide.getTermValue(termNames[i]);
			}
			arr[i] = val || 0;
		}
		return arr;
	};
	/**
	 * Returns an list of coefficients of terms from the left side.
	 * Note: The terms should only be on one side after normalized.
	 */
	Constraint.prototype.getTermValuesFromLeftSide = function (termNames) {
		if (!termNames) {
			return null;
		}
		var arr = new Array(termNames.length),
			val,
			i = arr.length;
		while (i--) {
			val = this.leftSide.getTermValue(termNames[i]);
			if (val === undefined) {
				val = -this.rightSide.getTermValue(termNames[i]);
			}
			arr[i] = val || 0;
		}
		return arr;
	};
	
	
	
	
	/**
	 *
	 * Input Object
	 *
	 */
	 
	 
	 
	
	var Input = function () {
		this.z = null;
		this.type = null;
		this.terms = null;
		this.constraints = null;
		this.isStandardMode = false;
	};
	// Holds constants
	Input.parse = function (type, z, constraints) {
		Input.validate(type, z, constraints);
		var obj = new Input();
		obj.type = type;
		obj.z = Expression.parse(z);
		obj.constraints = Input.getArrOfConstraints(constraints);
		obj.setTermNames();
		obj.checkConstraints();
		return obj;
	};
	Input.getArrOfConstraints = function (arr) {
		arr = (Matrix.isArray(arr)) ? arr : [arr];
		var constraints = [],
		i = arr.length;
		while (i--) {
			constraints[i] = Constraint.parse(arr[i]);
		}
		return constraints;
	};
	Input.validate = function (type, z, constraints) {
		if (typeof z !== "string") {
			throw new Error("z must be a string.");
		}
		if (type !== "maximize" && type !== "minimize") {
			throw new Error("`maximize` and `minimize` are the only types that is currently supported.");
		}
		if (!Matrix.isArray(constraints) || !constraints.length) {
			throw new Error("Constraints must be an array with at least one element.");
		}
	};
	/**
	 * Checks if any constraints the same comparison.
	 */
	Input.prototype.doAnyConstrainsHaveRelation = function (comparison) {
		if (!comparison) {
			return false;
		}
		comparison = new RegExp(comparison);
		return this.anyConstraints(function (i, constraint) {
			return comparison.test(constraint.comparison);
		});
	};
	/**
	 * Checks if all constraints the same comparison.
	 */
	Input.prototype.doAllConstrainsHaveRelation = function (comparison) {
		comparison = new RegExp(comparison);
		return this.allConstraints(function (i, constraint) {
			return comparison.test(constraint.comparison);
		});
	};
	/**
	 * Checks if the callback returns a truthy value for any constraints.
	 */
	Input.prototype.anyConstraints = function (fn) {
		for (var i = 0, len = this.constraints.length; i < len; i++) {
			if (fn(i, this.constraints[i], this.constraints)) {
				return true;
			}
		}
		return false;
	};
	/**
	 * Checks if the callback returns a truthy value for all constraints.
	 */
	Input.prototype.allConstraints = function (fn) {
		var result = true;
		for (var i = 0, len = this.constraints.length; i < len; i++) {
			result = result && !!fn(i, this.constraints[i], this.constraints);
		}
		return result;
	};
	/**
	 * Iterates over a the constraints, executing the callback for each element.
	 */
	Input.prototype.forEachConstraint = function (fn) {
		for (var i = 0, len = this.constraints.length; i < len; i++) {
			fn(i, this.constraints[i], this.constraints);
		}
	};
	Input.prototype.getAllArtificialNames = function () {
		var names = [];
		this.forEachConstraint(function (i, constraint) {
			var name = constraint.getArtificialName();
			if (name) {
				names.push(name);
			}
		});
		return names;
	};
	Input.prototype.addNumbersToSpecialTerms = function () {
		var c = this.constraints,
		slackI = 1,
		artificialI = 1;
		for (var i = 0, len = c.length; i < len; i++) {
			if (c[i].hasSpecialTerm("slack")) {
				c[i].renameSlack("slack" + slackI);
				slackI++;
			}
			if (c[i].hasSpecialTerm("artificial")) {
				c[i].renameArtificial("artificial" + artificialI);
				artificialI++;
			}
		}
	};
	/**
	 * Returns a list of term names
	 */
	Input.prototype.getTermNames = function (onlyVariables) {
		var vars = [],
		i = this.constraints.length;
		while (i--) {
			vars = vars.concat(this.constraints[i].getTermNames(onlyVariables));
		}
		return unique(vars).sort();
	};
	Input.prototype.getAllSpecialTermNames = function () {
		var names = [];
		this.forEachConstraint(function (i, constraint) {
			names = names.concat(
					constraint.getSpecialTermNames());
		});
		return names;
	};
	Input.prototype.setTermNames = function () {
		this.terms = this.getTermNames();
	};
	Input.prototype.getZTermNotInAnyOfTheConstraints = function () {
		var varMissing = "",
		terms = this.z.getTermNames(),
		term,
		i = 0,
		iLen = terms.length;
		
		for (; !varMissing && i < iLen; i++) {
			term = terms[i];
			for (var j = 0, jLen = this.constraints.length; j < jLen; j++) {
				if (this.constraints[j].leftSide.terms[term]) {
					break;
				}
			}
			if (j === jLen) {
				varMissing = term;
			}
		}
		return varMissing;
	};
	Input.prototype.checkConstraints = function () {
		var errMsg = [],
		missingZVar = this.getZTermNotInAnyOfTheConstraints();
		if (missingZVar) {
			errMsg.push("`" + missingZVar + "`, from the objective function, should appear least once in a constraint.");
		}
		return errMsg;
	};
	Input.prototype.toString = function () {
		return [this.type + " z = " + this.z, "where " + this.constraints.join(", ")].join(", ");
	};
	Input.prototype.convertConstraintsToMaxForm = function () {
		var c = this.constraints;
		for (var i = 0, len = c.length; i < len; i++) {
			c[i] = c[i].convertToEquation();
		}
	};
	Input.prototype.convertToStandardForm = function () {
		if (this.isStandardMode) {
			return this;
		}
		this.convertConstraintsToMaxForm();
		this.addNumbersToSpecialTerms();
		this.setTermNames();
		this.isStandardMode = true;
		return this;
	};	
	
	
	
	
	/**
	 *
	 * Expression Object
	 *
	 */
	
	
	/**
	 * Goals for the Expression Object:
	 * - Convert String to Object such that the terms, constants and sign and be easily accessed.
	 */
	var Expression = function () {
		this.terms = {};
	};
	/**
	 * Converts a string to a Expression Object.
	 */
	Expression.parse = function (str) {
		var obj = new Expression();
		if (typeof str !== "string" || !str.length) {
			return obj;
		}
		Expression.validate(str);
		obj.terms = Expression.convertExpressionToObject(Expression.addSpaceBetweenTerms(str));
		return obj;
	};
	/**
	 * Converts scientific notated values to special characters.
	 * This is needed so the `e` and power aren't treated as a variable.
	 */
	Expression.encodeE = function (str) {
		return str.replace(/(\de)([+])(\d)/gi, "$1_plus_$3").replace(/(\de)([\-])(\d)/gi, "$1_sub_$3");
	};
	/**
	 * Converts special characters for scientific notated values back to original.
	 */
	Expression.decodeE = function (str) {
		return str.replace(/_plus_/g, "+").replace(/_sub_/g, "-");
	};
	/**
	 * Adds spaces in between terms
	 */
	Expression.addSpaceBetweenTerms = function (str) {
		return Expression.decodeE(Expression.encodeE(str).replace(/([\+\-])/g, " $1 ").trim());
	};
	/**
	 * Checks to see if a string has any of the these symbols; "*", "\", "%".
	 */
	Expression.hasExcludedOperations = function (str) {
		return (/[\*\/%]/).test(str);
	};
	/**
	 * Checks to see if a string doesn't have a left and right terms with each addition and subtraction operation.
	 */
	Expression.hasIncompleteBinaryOperator = function (str) {
		var hasError,
			noSpaceStr = ("" + str).replace(/\s/g, ""),
			RE_hasNoPlusOrMinus = /^[^\+\-]+$/,
			RE_noLeftAndRightTerms = /[\+\-]{2}|[\+\-]$/,
			hasMoreThanOneTerm = /\S+\s+\S+/.test(str);
		hasError = hasMoreThanOneTerm && RE_hasNoPlusOrMinus.test(noSpaceStr);
		hasError = hasError || RE_noLeftAndRightTerms.test(noSpaceStr);
		return hasError;
	};
	/**
	 * Checks to see if string has a comparison.
	 */
	Expression.hasComparison = function (str) {
		return (/[><=]/).test(str);
	};
	/**
	 * Checks to see if string comply with standards.
	 */
	Expression.validate = function (str) {
		if (Expression.hasComparison(str)) {
			throw new Error("Comparison are not allowed within an expression.");
		}
		if (Expression.hasExcludedOperations(str)) {
			throw new Error("Sorry but we only support addition and subtraction.");
		}
		if (Expression.hasIncompleteBinaryOperator(str)) {
			throw new Error("Exactly one math operators must be between terms.\n Good:(a+b). Bad:(a+- b+).");
		}
	};
	/**
	 * Extracts coefficient and variable name from a variable.
	 */
	Expression.extractComponentsFromVariable = function (str) {
		str = "" + str;
		var re = /^[\+\-]?\d+(\.\d+)?(e[\+\-]?\d+)?/i,
			coeff = "" + (str.match(re) || [""])[0],
			term = str.replace(re, '') || 1;
		if (+str === 0) {
			coeff = 0;
		}
		if (coeff === "") {
			coeff = /^\-/.test(term) ? -1 : 1;
			term = term.replace(/^[\+\-]/, "");
		}
		return [+coeff, term];
	};
	/**
	 * Split string by terms.
	 *
	 * remove plus at the start of string
	 * put the sign and term together
	 * split by space and plus sign
	 */
	Expression.splitStrByTerms = function (str) {
		return ("" + str).replace(/^\+/, "").replace(/([\+\-])\s+/g, "$1").split(/\s+[\+]?/);
	};
	/**
	 * Converts an linear algebraic expression into an object.
	 */
	Expression.convertExpressionToObject = function (str) {
		var term,
			obj = {},
			matches = Expression.splitStrByTerms((str || "").trim()),
			i = matches.length;
		while (i--) {
			term = Expression.extractComponentsFromVariable(matches[i]);
			obj[term[1]] = (obj[term[1]]) ? (obj[term[1]]) + term[0] : term[0];
		}
		return obj;
	};
	/**
	 * Returns the proper string representation for a term.
	 */
	Expression.termAtIndex = function (i, name, value) {
		return (value ? ((value < 0) ? (value == -1 ? "-" : value) : ((i ? "+" : "") + (value == 1 ? "" : value))) : (0 < name && i ? "+" : ""))+ name;
	};
	/**
	 * Returns an array of alphanumeric sorted variables without the coefficients.
	 */
	Expression.prototype.getTermNames = function (excludeNumbers, excludeSlack) {
		var obj = this.terms,
			terms = [],
			key;
		for (key in obj) {
			if (!obj.hasOwnProperty(key) || (excludeSlack && /^slack\d*$/i.test(key))) {
				continue;
			}
			if (isNaN(key)) {
				terms.push(key);
			}
		}
		terms = terms.sort();
		if (!excludeNumbers && obj && obj[1]) {
			terms.push(obj[1].toString());
		}
		return terms;
	};
	/**
	 * Iterates through each term in the expression.
	 * Each call passes the "term name", "term value", and "term object holder"
	 */
	Expression.prototype.forEachTerm = function (fn) {
		if (typeof fn !== "function") {
			return;
		}
		for (var prop in this.terms) {
			if (this.terms.hasOwnProperty(prop)) {
				fn(prop, this.terms[prop], this.terms);
			}
		}
	};
	/**
	 * Iterates through each constant in the expression.
	 * Each call passes the "term name", "term value", and "term object holder"
	 */
	Expression.prototype.forEachConstant = function (fn) {
		if (typeof fn !== "function") {
			return;
		}
		var prop = "1";
		if (this.terms[prop]) {
			fn(prop, this.terms[prop], this.terms);
		}
	};
	/**
	 * Iterates through each variable in the expression.
	 * Each call passes the "term name", "term value", and "term object holder"
	 */
	Expression.prototype.forEachVariable = function (fn) {
		if (typeof fn !== "function") {
			return;
		}
		for (var prop in this.terms) {
			if (this.terms.hasOwnProperty(prop) && prop !== "1") {
				fn(prop, this.terms[prop], this.terms);
			}
		}
	};
	/**
	 * Converts the Expression object to a string by turning the terms property to a expression.
	 */
	Expression.prototype.toString = function () {
		var arr = [],
			names = this.getTermNames(),
			i,
			name,
			len,
			func = Expression.termAtIndex;
		if (!names.length) {
			return "0";
		}
		for (i = 0, len = names.length; i < len; i++) {
			name = names[i];
			arr.push(func(i, name, this.terms[name]));
		}
		return arr.join(" ").replace(/\s[\+\-]/g, "$& ");
	};
	/**
	 * Multiplies the expression by -1
	 */
	Expression.prototype.inverse = function () {
		this.forEachTerm(function (termName, value, terms) {
			terms[termName] = -value;
		});
		return this;
	};
	/**
	 * Adds a new term to the expression.
	 */
	Expression.prototype.addTerm = function (name, value) {
		if(typeof value !== "undefined"){
			value += this.terms[name] || 0;
			if (value) {
				this.terms[name] = value;
			} else {
				this.removeTerm(name);
			}
		}else{
			this.addExpression(name);
		}
		return this;
	};
	/**
	 * Updates the value of a term
	 */
	Expression.prototype.setTerm = function (name, value) {
		if (value) {
			this.terms[name] = value;
		} else {
			this.removeTerm(name);
		}
		return this;
	};
	/**
	 * Adds an expression to the current expression
	 */
	Expression.prototype.addExpression = function (obj) {
		if (!(obj instanceof Expression)) {
			obj = Expression.parse(obj);
		}
		this.addTerms(obj.toTermValueArray());
		return this;
	};
	/**
	 * returns array of String[]
	 */
	Expression.prototype.toTermValueArray = function () {
		var arr = [];
		for (var name in this.terms) {
			if (this.terms.hasOwnProperty(name)) {
				arr.push([name, this.terms[name]]);
			}
		}
		return arr;
	};
	/**
	 * Add multiple terms to the expression
	 */
	Expression.prototype.addTerms = function (arr) {
		if (!arr || typeof arr !== "object") {
			return this;
		}
		for (var i = 0, len = arr.length; i < len; i++) {
			if (arr[i] && typeof arr[i] === "object") {
				this.addTerm(arr[i][0], arr[i][1]);
			}
		}
		return this;
	};
	/**
	 * Removes a term from the expression.
	 */
	Expression.prototype.removeTerm = function (name) {
		delete this.terms[name];
		return this;
	};
	/**
	 * Multiplies all terms by a factor
	 */
	Expression.prototype.scale = function (factor) {
		this.forEachTerm(function (name, value, terms) {
			terms[name] = (factor * value);
		});
		return this;
	};
	/**
	 * Checks if a term exist within an expression.
	 */
	Expression.prototype.hasTerm = function (name) {
		return !!this.terms[name];
	};
	/**
	 * Returns the value of a term
	 * note: undefined is returned if the term doesn't exist.
	 */
	Expression.prototype.getTermValue = function (name) {
		return this.terms[name];
	};
	/**
	 * Returns a list of coefficients for each term
	 */
	Expression.prototype.getAllCoeffients = function (excludeNumbers, excludeSlack) {
		var arr = [],
			names = this.getTermNames(excludeNumbers, excludeSlack);
		for (var i = 0, len = names.length; i < len; i++) {
			arr.push( + (this.terms[names[i]] || names[i]));
		}
		return arr;
	};
	/**
	 * Return an array of term coefficients
	 */
	Expression.prototype.getCoefficients = function (termNames) {
		var arr = [],
			i = termNames.length;
		while (i--) {
			arr[i] = this.terms[termNames[i]] || 0;
		}
		return arr;
	};
	
	
	
	
	/**
	 *
	 * Simplex Object
	 *
	 */
	
	
	
	var Simplex = function () {
		this.input = new Input();
		this.tableau = new Tableau();
		this.output = "";
		this.state = null;
	};
	/**
	 * Checks if input to `Simplex.solve()` is correct.
	 */
	Simplex.validate = function (obj) {
		if (typeof obj !== "object") {
			throw new Error("An object must be passed to Simplexify.solve()");
		}
		if (!obj.type || !obj.objective || !obj.constraints) {
			throw new Error("The object must have the properties `type`, `objective` and `constraints`.");
		}
	};
	
	
	
	
	/**
	 *
	 * Matrix Object
	 *
	 */
	 
	 
	var Matrix = function () {
		this.array = [];
	};
	/**
	 * Checks if an object is an array.
	 */
	Matrix.isArray = function (obj) {
		return Object.prototype.toString.call(obj) === "[object Array]";
	};
	/**
	 * Converts an array to a matrix
	 */
	Matrix.parse = function (input) {
		var obj = new Matrix(),
		isArray = Matrix.isArray(input);
		
		if (input !== undefined && !(isArray && !input.length)) {
			if (isArray && Matrix.isArray(input[0])) {
				obj.array = input;
			} else {
				input = isArray ? input : [input];
				obj.addRow(input);
			}
		}
		return obj;
	};
	/**
	 * Returns a copy of a single dimensional array multiplied by factor
	 */
	Matrix.scaleRow = function (scale, row) {
		if (!Matrix.isArray(row)) {
			return row;
		}
		row = row.concat();
		for (var i = 0, len = row.length; i < len; i++) {
			row[i] *= scale;
		}
		return row;
	};
	/**
	 * Adds two single dimensional arrays together
	 */
	Matrix.addRows = function (rowA, rowB) {
		return Matrix.scaleThenAddRows(1, rowA, 1, rowB);
	};
	/**
	 * Scales two single dimensional arrays then adds them together.
	 * Same as ((scaleA * rowA) + (scaleB * rowB))
	 */
	Matrix.scaleThenAddRows = function (scaleA, rowA, scaleB, rowB) {
		rowA = (Matrix.isArray(rowA)) ? rowA.concat() : [];
		rowB = (Matrix.isArray(rowB)) ? rowB.concat() : [];
		var len = Math.max(rowA.length, rowB.length);
		for (var i = 0; i < len; i++) {
			rowA[i] = (scaleA * (rowA[i] || 0)) + (scaleB * (rowB[i] || 0));
		}
		return rowA;
	};
	/**
	 * Negates all elements in a single dimensional array.
	 */
	Matrix.inverseArray = function (arr) {
		if (!Matrix.isArray(arr)) {
			return arr;
		}
		var i = arr.length;
		while (i--) {
			arr[i] = -arr[i];
		}
		return arr;
	};
	/**
	 * Returns the transposed array of an array
	 */
	Matrix.transpose = function (arr) {
		if (!Matrix.isArray(arr) || !arr.length || !Matrix.isArray(arr[0])) {
			return null;
		}
		var result = [],
		iLen = arr.length,
		info = Matrix.getMaxArray(arr),
		jLen = info ? info.max : 0;
		
		for (var i = 0; i < jLen; i++) {
			result[i] = [];
			for (var j = 0; j < iLen; j++) {
				result[i][j] = arr[j][i];
			}
		}
		return result;
	};
	/**
	 * Find the index and value of the largest positive or negative number in an array.
	 */
	Matrix.getGreatestElementInRow = function (arr, excludeIndex, findPositive) {
		if (!arr || !Matrix.isArray(arr)) {
			return null;
		}
		var obj = {
			value : Infinity * (findPositive ? -1 : 1),
			index : -1
		};
		
		for (var i = 0, len = arr.length; i < len; i++) {
			if (excludeIndex === i) {
				continue;
			}
			if ((findPositive && obj.value < arr[i]) || (!findPositive && arr[i] < obj.value)) {
				obj.index = i;
				obj.value = arr[i];
			}
		}
		return obj;
	};
	/**
	 * Adds a new single dimensional array
	 */
	Matrix.prototype.addRow = function (arr) {
		arr = Matrix.isArray(arr) ? arr : [arr];
		this.array.push(arr);
		return this;
	};
	/**
	 * Transpose the matrix
	 */
	Matrix.prototype.transpose = function () {
		this.array = Matrix.transpose(this.array);
		return this;
	};
	/**
	 * Checks if the current instance has the same values as other matrix.
	 */
	Matrix.prototype.equals = function (obj) {
		return obj && obj instanceof Matrix && this.toString() === obj.toString();
	};
	/**
	 * Returns an element specified by a row and column.
	 */
	Matrix.prototype.getElement = function (i, j) {
		return this.array[i][j];
	};
	/**
	 * Returns the column of an array
	 */
	Matrix.prototype.getColumn = function (j) {
		var arr = [];
		this.forEachRow(function (i, row) {
			arr.push(row[j]);
		});
		return arr;
	};
	/**
	 * Returns the row of an array
	 */
	Matrix.prototype.getRow = function (i) {
		return this.array[i];
	};
	/**
	 * Returns the column, row or element of an array
	 */
	Matrix.prototype.get = function (row, col) {
		if (!col && col !== 0) {
			return this.getRow(row);
		} else if (row || row === 0) {
			return this.getElement(row, col);
		} else {
			return this.getColumn(col);
		}
	};
	/**
	 * For each row of the matrix, calls an callback.
	 * The arguments are `fn( index, row, matrix )`
	 */
	Matrix.prototype.forEachRow = function (fn) {
		if (typeof fn === "function") {
			for (var i = 0, len = this.array.length; i < len; i++) {
				fn(i, this.array[i], this.array);
			}
		}
		return this;
	};
	/**
	 * For each row of the matrix, calls an callback.
	 * If the callback returns an array, then the current row is replaced that.
	 * The arguments are `fn( index, row, matrix )`
	 */
	Matrix.prototype.replaceEachRow = function (fn) {
		var newRow;
		if (typeof fn === "function") {
			for (var i = 0, len = this.array.length; i < len; i++) {
				newRow = fn(i, this.array[i], this.array);
				if (newRow && Matrix.isArray(newRow)) {
					this.array[i] = newRow;
					newRow = null;
				}
			}
		}
		return this;
	};
	/**
	 * Returns the matrix as an array.
	 */
	Matrix.prototype.toArray = function () {
		return this.array;
	};
	/**
	 * Returns the index of the element in the last row with the greatest negativity or positivity.
	 * Note: This excludes the last element in the row. The last element in each row is reserved as "Right Hand Side".
	 */
	Matrix.prototype.getGreatestValueFromLastRow = function (isPositive) {
		if (!this.array || this.array.length < 1) {
			return -1;
		}
		var row = this.array[this.array.length - 1];
		var obj = Matrix.getGreatestElementInRow(row, row.length - 1, !!isPositive);
		
		if (isPositive) {
			return -1 < obj.value ? obj.index : -1;
		} else {
			return obj.value < 0 ? obj.index : -1;
		}
	};
	/**
	 * Returns the row index of the
	 */
	Matrix.prototype.getRowIndexWithPosMinColumnRatio = function (colI, excludeLastRow) {
		var obj = {
			rowIndex : -1,
			minValue : Infinity
		},
		len = this.array.length + (excludeLastRow ? -1 : 0),
		val,
		row;
		
		if (colI < 0 || this.array[0].length <= colI) {
			return null;
		}
		for (var i = 0; i < len; i++) {
			row = this.array[i];
			val = row[row.length - 1] / row[colI];
			if (0 <= val && val < obj.minValue) {
				obj.rowIndex = i;
				obj.minValue = val;
			}
		}
		return obj;
	};
	/**
	 * Sets all rows to the width of the longest row
	 */
	Matrix.prototype.setUniformedWidth = function () {
		var info = Matrix.getMaxArray(this.array);
		for (var i = 0, len = this.array.length; i < len; i++) {
			this.array[i].length = info.max;
		}
		return this;
	};
	/**
	 * Returns the matrix as a string
	 */
	Matrix.prototype.toString = function () {
		var str = "";
		this.forEachRow(function (i, row) {
			if (i) {
				str += ",";
			}
			str += "[" + row.toString() + "]";
		});
		str = "[" + str + "]";
		return str;
	};
	/**
	 * Returns the size of the matrix
	 */
	Matrix.prototype.getSize = function () {
		var columns = 0,
		rows = this.array.length,
		i = rows,
		x;
		while (i--) {
			x = this.array[i].length;
			columns = columns < x ? x : columns;
		}
		return [columns, rows];
	};
	/**
	 * Multiplies a row by a factor.
	 */
	Matrix.prototype.scaleRow = function (scaleA, rowI) {
		var row = this.array[rowI] || [];
		for (var i = 0, len = row.length; i < len; i++) {
			row[i] *= scaleA;
		}
		return this;
	};
	/**
	 * Appends element(s) to the end of a row in the matrix.
	 * Or adds a new row to the matrix.
	 */
	Matrix.prototype.addToRow = function (iRow, els) {
		if (this.array[iRow]) {
			this.array[iRow] = (this.array[iRow] || []).concat(els);
		} else {
			this.addRow(els);
		}
		return this;
	};
	/**
	 * Returns the index and max length of the longest row in an array.
	 */
	Matrix.getMaxArray = function (arrays) {
		var obj = {
			index : 0,
			max : 0
		};
		if (!Matrix.isArray(arrays)) {
			return null;
		}
		if (!Matrix.isArray(arrays[0])) {
			obj.max = arrays.length;
			return obj;
		}
		var i = arrays.length;
		while (i--) {
			if (obj.max < arrays[i].length) {
				obj.index = i;
				obj.max = arrays[i].length;
			}
		}
		return obj;
	};
	/**
	 * Pivots the matrix at the specified row and column.
	 * Pivoting forces a specified row and column element to 1,
	 * with the rest of the column elements to zero through basic row operations.
	 */
	Matrix.prototype.pivot = function (rowI, colI) {
		if (!this.array[rowI]) {
			return this;
		}
		var x = this.getElement(rowI, colI),
		val,
		pRow;
		
		// force element at (rowI, colI) to 1
		this.scaleRow(1 / x, rowI);
		pRow = this.array[rowI];
		
		// force element at (i, colI) to 0, this works because (rowI, colI) == 1,
		// so just multiply by the negative -1 and add to the current row.
		for (var i = 0, len = this.array.length; i < len; i++) {
			if (i === rowI) {
				continue;
			}
			val = this.getElement(i, colI);
			this.array[i] = Matrix.scaleThenAddRows(-val, pRow, 1, this.array[i]);
		}
		return this;
	};
	/**
	 * Return the unit value for a column.
	 * If a column has only one non-zero value then
	 * the last element in the row (RHS element) is returned.
	 * Otherwise, 0 is returned.
	 */
	Matrix.prototype.getUnitValueForColumn = function (colI) {
		var nonZeroValues = 0,
		val = 0;
		
		this.forEachRow(function (i, row) {
			if (row[colI] === 1) {
				// get value in the Right Hand Side(RHS)
				val = row[row.length - 1];
			}
			if (row[colI]) {
				nonZeroValues++;
			}
		});
		val = (nonZeroValues === 1) ? val : 0;
		return val;
	};
	/**
	 * Returns the last element in the last row of the matrix.
	 */
	Matrix.prototype.getLastElementOnLastRow = function () {
		var row = this.array[this.array.length - 1];
		return row[row.length - 1];
	};
	
	
	
	/**
	 *
	 * Tableau Object
	 *
	 */
	

	var Tableau = function () {
		this.input = null;
		this.colNames = null;
		this.matrix = null;
		this.limit = 1e4;
		this.cycles = 0;
	};
	Tableau.validate = function (input) {
		if (!(input instanceof Input)) {
			throw new Error("Must pass an instance of the Input class.");
		}
	};
	/**
	 * Parse the input and returns new instance of Tableau
	 */
	Tableau.parse = function (input) {
		var obj = new Tableau();
		Tableau.validate(input);
		obj.input = input.convertToStandardForm();
		obj.setMatrixFromInput();
		return obj;
	};
	/**
	 * Returns the pivot point of a Tableau
	 */
	Tableau.getPivotPoint = function (matrix, isMin) {
		if (!(matrix instanceof Matrix)) {
			return null;
		}
		var point = {};
		point.column = matrix.getGreatestValueFromLastRow(!!isMin);
		var obj = matrix.getRowIndexWithPosMinColumnRatio(point.column, true) || {};
		point.row = obj.rowIndex;
		if (point.column < 0 || point.row < 0) {
			return null;
		}
		return point;
	};
	Tableau.prototype.addConstraintsToMatrix = function (termNames) {
		var constraints = this.input.constraints;
		for (var i = 0, len = constraints.length; i < len; i++) {
			this.matrix.addRow(constraints[i].getCoefficients(termNames));
		}
	};
	Tableau.prototype.getSortedTermNames = function () {
		var termNames = this.input.getTermNames(true),
			specialNames = this.input.getAllSpecialTermNames();
		return sortArrayWithSubsetAtEnd(termNames, specialNames);
	};
	/**
	 * Appends the objective function to the end of the matrix.
	 */
	Tableau.prototype.addZToMatrix = function (termNames) {
		var b = Constraint.parse("0 = " + this.input.z.toString());
			b.moveTypeToOneSide("left", "right");
		var row = b.leftSide.getCoefficients(termNames);
			row = row.concat(b.rightSide.getTermValue("1") || 0);
		this.matrix.addRow(row);
	};
	Tableau.prototype.setMatrixFromInput = function () {
		this.matrix = new Matrix();
		this.colNames = this.getSortedTermNames();
		this.addConstraintsToMatrix(this.colNames.concat("1"));
		this.addZToMatrix(this.colNames);
	};
	Tableau.prototype.toString = function () {
		var result = "";
		if (this.matrix) {
			result += "[" + this.colNames.concat("Constant").toString() + "],";
			result += this.matrix.toString();
		}
		return result;
	};
	Tableau.prototype.solve = function (isMin) {
		var getPoint = Tableau.getPivotPoint,
			point = getPoint(this.matrix, isMin),
			limit = this.limit;
		while (point && limit--) {
			this.matrix.pivot(point.row, point.column);
			point = getPoint(this.matrix, isMin);
			this.cycles++;
		}
		return this;
	};
	Tableau.prototype.getOutput = function () {
		var obj = {},
			names = this.colNames.concat();
		for (var i = 0, len = names.length; i < len; i++) {
			obj[names[i]] = this.matrix.getUnitValueForColumn(i);
		}
		obj.z = this.matrix.getLastElementOnLastRow();
		return JSON.stringify(obj);
	};

	
	
	
	Simplexify.solve = function (input) {
		Simplex.validate(input);
		return Tableau.parse(
			Input.parse(input.type, input.objective, input.constraints)).solve().getOutput();
	};
	
	window.Simplexify = Simplexify;
}());
