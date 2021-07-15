import { appAdditionalDataForAPI, getFormattedMetadata } from './additionalData/functions';
import { INCOMPLETE, INCOMPLETE_SAMPLE_TREE } from './inventoryConstants';

export default function getGeoJsonData(inventoryData: any) {
  let featureList;
  let appAdditionalDetails: any = {};
  if (
    inventoryData &&
    (inventoryData.status === INCOMPLETE || inventoryData.status === INCOMPLETE_SAMPLE_TREE)
  ) {
    appAdditionalDetails = appAdditionalDataForAPI({ data: inventoryData });
  }
  const metadata = getFormattedMetadata([...inventoryData.additionalDetails]);
  metadata.app = { ...metadata.app, ...appAdditionalDetails };

  if (
    inventoryData.polygons[0].coordinates.length === 1 &&
    inventoryData.polygons[0].isPolygonComplete
  ) {
    featureList = [
      {
        type: 'Feature',
        properties: {
          isPolygonComplete: inventoryData.polygons[0].isPolygonComplete,
          ...metadata,
        },
        geometry: {
          type: 'Point',
          coordinates: [
            inventoryData.polygons[0].coordinates[0].longitude,
            inventoryData.polygons[0].coordinates[0].latitude,
          ],
        },
      },
    ];
  } else {
    featureList = inventoryData.polygons.map((onePolygon: any) => {
      return {
        type: 'Feature',
        properties: {
          isPolygonComplete: onePolygon.isPolygonComplete,
          ...metadata,
        },
        geometry: {
          type: 'LineString',
          coordinates: onePolygon.coordinates.map((oneCoordinate: any) => [
            oneCoordinate.longitude,
            oneCoordinate.latitude,
          ]),
        },
      };
    });
    if (inventoryData.sampleTrees.length > 0) {
      for (const sampleTree of inventoryData.sampleTrees) {
        let appAdditionalDetails: any = [];
        if (
          inventoryData.status === INCOMPLETE ||
          inventoryData.status === INCOMPLETE_SAMPLE_TREE
        ) {
          appAdditionalDetails = appAdditionalDataForAPI({
            data: sampleTree,
            isSampleTree: true,
          });
        }
        const metadata = getFormattedMetadata([...sampleTree.additionalDetails]);
        metadata.app = { ...metadata.app, ...appAdditionalDetails };

        featureList.push({
          type: 'Feature',
          properties: { ...metadata },
          geometry: {
            type: 'Point',
            coordinates: [sampleTree.longitude, sampleTree.latitude],
          },
        });
      }
    }
  }
  let geoJSONData = {
    type: 'FeatureCollection',
    features: featureList,
  };

  return geoJSONData;
}
