import { maxHeightDiameterRatio, meterToCentimeter, minHeightDiameterRatio } from './constants';

interface IRatioParams {
  height: number;
  diameter: number;
}
// checks and return [boolean] whether height to diameter ratio is in between the min and max ratio range
const getIsMeasurementRatioCorrect = ({ height, diameter }: IRatioParams): boolean => {
  const currentHeightDiameterRatio = (height * meterToCentimeter) / diameter;

  const roundOffRatio = Math.round(currentHeightDiameterRatio * 100) / 100;

  return roundOffRatio >= minHeightDiameterRatio && roundOffRatio <= maxHeightDiameterRatio;
};

export default getIsMeasurementRatioCorrect;
