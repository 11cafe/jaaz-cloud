// eslint-rules/no-update-without-where.js

module.exports = {
  meta: {
    type: "problem",
    docs: {
      description: "Disallow updates without a where clause",
      category: "Best Practices",
      recommended: false,
    },
    schema: [], // no options
  },
  create: function (context) {
    return {
      CallExpression(node) {
        // Check if the method is `set` and the object is `update`
        if (
          node.callee.type === "MemberExpression" &&
          node.callee.property.name === "set" &&
          node.callee.object.type === "CallExpression" &&
          node.callee.object.callee.type === "MemberExpression" &&
          node.callee.object.callee.property.name === "update"
        ) {
          let parent = node.parent;

          // Traverse the chain to check for `.where()`
          while (parent && parent.type === "MemberExpression") {
            if (parent.property.name === "where") {
              return; // Found `.where()`, exit the check
            }
            parent = parent.parent;
          }

          // Report an error if `.where()` is not found in the chain
          context.report({
            node,
            message:
              "Update operation without where clause detected. This can result in updating all records.",
          });
        }
      },
    };
  },
};
