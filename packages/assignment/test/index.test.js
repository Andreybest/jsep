import jsep from '../../../src/index.js';
import assignment from '../src/index.js';
import {testParser, resetJsepDefaults, esprimaComparisonTest} from '../../../test/test_utils.js';

const { test } = QUnit;

(function () {
	QUnit.module('Plugin:Assignment', (qunit) => {
		const operators = [
			'=',
			'*=',
			'**=',
			'/=',
			'%=',
			'+=',
			'-=',
			'<<=',
			'>>=',
			'>>>=',
			'&=',
			'^=',
			'|=',
		];

		qunit.before(() => jsep.plugins.register(assignment));
		qunit.after(resetJsepDefaults);

		operators.forEach(op => test(`should correctly parse assignment operator, ${op}`, (assert) => {
			testParser(`a ${op} 2`, {
				type: "AssignmentExpression",
				operator: op,
				left: {
					type: "Identifier",
					name: "a"
				},
				right: {
					type: "Literal",
					value: 2,
					raw: "2"
				}
			}, assert);
		}));

		test('should correctly parse chained assignment', (assert) => {
			testParser('a = b = c + 1 = d', {
				type: 'AssignmentExpression',
				operator: '=',
				left: {
					type: 'AssignmentExpression',
					operator: '=',
					left: {
						type: 'AssignmentExpression',
						operator: '=',
						left: {
							type: 'Identifier',
							name: 'a'
						},
						right: {
							type: 'Identifier',
							name: 'b'
						}
					},
					right: {
						type: 'BinaryExpression',
						operator: '+',
						left: {
							type: 'Identifier',
							name: 'c'
						},
						right: {
							type: 'Literal',
							value: 1,
							raw: '1'
						}
					}
				},
				right: {
					type: 'Identifier',
					name: 'd'
				}
			}, assert);
		});

		test('should correctly parse chained assignment in ternary', (assert) => {
			testParser('a = b = c ? d : e = 2', {
				type: 'AssignmentExpression',
				operator: '=',
				left: {
					type: 'AssignmentExpression',
					operator: '=',
					left: {
						type: 'Identifier',
						name: 'a'
					},
					right: {
						type: 'Identifier',
						name: 'b'
					}
				},
				right: {
					type: 'ConditionalExpression',
					test: {
						type: 'Identifier',
						name: 'c'
					},
					consequent: {
						type: 'Identifier',
						name: 'd'
					},
					alternate: {
						type: 'AssignmentExpression',
						operator: '=',
						left: {
							type: 'Identifier',
							name: 'e'
						},
						right: {
							type: 'Literal',
							value: 2,
							raw: '2'
						}
					}
				}
			}, assert);
		});

		test('should correctly parse assignment in ternary alternate', (assert) => {
			testParser('a ? fn(a) : a = 1', {
				type: 'ConditionalExpression',
				test: {
					type: 'Identifier',
					name: 'a'
				},
				consequent: {
					type: 'CallExpression',
					arguments: [
						{
							type: 'Identifier',
							name: 'a'
						}
					],
					callee: {
						type: 'Identifier',
						name: 'fn'
					}
				},
				alternate: {
					type: 'AssignmentExpression',
					operator: '=',
					left: {
						type: 'Identifier',
						name: 'a'
					},
					right: {
						type: 'Literal',
						value: 1,
						raw: '1'
					}
				}
			}, assert);
		});

		[
			{ expr: 'a++', expect: { operator: '++', prefix: false } },
			{ expr: 'a--', expect: { operator: '--', prefix: false } },
			{ expr: '++a', expect: { operator: '++', prefix: true } },
			{ expr: '--a', expect: { operator: '--', prefix: true } },
		].forEach(testCase => test(`should handle basic update expression ${testCase.expr}`, (assert) => {
			testParser(testCase.expr, Object.assign({
				type: "UpdateExpression",
				argument: {
					type: "Identifier",
					name: "a",
				},
			}, testCase.expect), assert);
		}));

		[
			'fn()++',
			'1++',
			'++',
			'(a + b)++',
			'--fn()',
			'--1',
			'--',
			'--(a + b)',
		].forEach(expr => test(`should throw on invalid update expression, ${expr}`, (assert) => {
			assert.throws(() => jsep(expr));
		}));

		[
			...operators
				.filter(op => op !== '**=') // not supported by esprima
				.map(op => `a ${op} 2`),
			'a++',
			'++a',
			'a--',
			'--a',
			'++a == 2',
			'a++ == 2',
			'2 == ++a',
			'2 == a++',
			'a ? a[1]++ : --b',
		].forEach((expr) => {
			test(`should match Esprima: ${expr}`, function (assert) {
				esprimaComparisonTest(expr, assert);
			});
		});
	});
}());
