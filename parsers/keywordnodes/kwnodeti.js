const constants = require("../../constants.js");
const BaseKwNode = require("./basekwnode");
const variableTypes = require("../nodeLiterals/variabletypes.js");

class KwNodeTi extends BaseKwNode {

    getNode() {
        this.skipKeyword(constants.KW.TI);

        const node =  {
            operation: constants.SYM.ASSIGN,
        };

        node.left = this.parseVarname();

        const nextTokenValue = this.lexer.peek().value;

        //if current variable is not a function call
        if (nextTokenValue != constants.SYM.L_BRACKET) {
            if (variableTypes[nextTokenValue] != undefined) {
                return variableTypes[nextTokenValue].getNodeLiteral.call(this, currentToken);
            }
        }
        

        this.skipOperator(constants.SYM.ASSIGN);
        node.right  = this.parseExpression();
        this.skipPunctuation(constants.SYM.STATEMENT_TERMINATOR);

        return node;
    }
}

module.exports = new KwNodeTi();