module.exports = {
  extends: "../../config/eslint.cjs",
  rules: {
    "node/file-extension-in-import": [
      "warning",
      "always" ,
      {
          "tryExtensions": [".js", ".json", ".node"],
        
      }
  ]
  }
}
