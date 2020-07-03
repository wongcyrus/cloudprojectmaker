export interface IHelper {
  getGraderParmeters(): any;
}

export class Helper implements IHelper {
  getGraderParmeters = (): any => {
    if (process.env.graderParameter)
      return JSON.parse(process.env.graderParameter);
    return {};
  };
}
