const validateRequest = (schema) => {
  //zod validation check kore..Schemar shathe attributes gula milaya dekhe..Na mille error show kore
  return async (req, res, next) => {
    try {
      await schema.parseAsync({
        body: req.body,
      });
      next();
    } catch (error) {
      next(error);
    }
  };
};

export default validateRequest;
