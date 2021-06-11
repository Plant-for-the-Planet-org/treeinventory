import { getInventory, updateInventory } from '../repositories/inventory';
import dbLog from '../repositories/logs';
import { LogTypes } from './constants';
import { PENDING_DATA_UPLOAD } from './inventoryConstants';

export const updateSampleTree = ({
  toUpdate,
  value = null,
  inventory,
  sampleTreeIndex,
  setInventory,
}: {
  toUpdate: string;
  value: any;
  inventory: any;
  sampleTreeIndex: any;
  setInventory: any;
}) => {
  let updatedSampleTrees = inventory.sampleTrees;
  let sampleTree = updatedSampleTrees[sampleTreeIndex];
  let inventoryData = {};
  switch (toUpdate) {
    case 'diameter': {
      sampleTree = {
        ...sampleTree,
        specieDiameter: value,
      };
      break;
    }
    case 'height': {
      sampleTree = {
        ...sampleTree,
        specieHeight: value,
      };
      break;
    }
    case 'tagId': {
      sampleTree = {
        ...sampleTree,
        tagId: value,
      };
      break;
    }
    case 'plantationDate': {
      sampleTree = {
        ...sampleTree,
        plantationDate: value,
      };
      break;
    }
    case 'specie': {
      sampleTree = {
        ...sampleTree,
        specieId: value?.guid,
        specieName: value?.scientificName,
      };
      break;
    }
    case 'changeStatusToPending': {
      sampleTree = {
        ...sampleTree,
        status: PENDING_DATA_UPLOAD,
      };
      inventoryData = {
        ...inventoryData,
        completedSampleTreesCount: inventory.completedSampleTreesCount + 1,
      };
      break;
    }
    default:
      break;
  }
  updatedSampleTrees[sampleTreeIndex] = sampleTree;

  inventoryData = {
    ...inventoryData,
    sampleTrees: [...updatedSampleTrees],
  };

  updateInventory({
    inventory_id: inventory.inventory_id,
    inventoryData,
  })
    .then(() => {
      dbLog.info({
        logType: LogTypes.INVENTORY,
        message: `Successfully modified ${toUpdate} for sample tree #${
          sampleTreeIndex + 1
        } having inventory_id: ${inventory.inventory_id}`,
      });
      getInventory({ inventoryID: inventory.inventory_id }).then((inventoryData) => {
        setInventory(inventoryData);
      });
    })
    .catch((err) => {
      dbLog.error({
        logType: LogTypes.INVENTORY,
        message: `Failed to modify ${toUpdate} for sample tree #${
          sampleTreeIndex + 1
        } having inventory_id: ${inventory.inventory_id}`,
      });
      console.error(
        `Failed to modify ${toUpdate} for sample tree #${
          sampleTreeIndex + 1
        } having inventory_id: ${inventory.inventory_id}`,
        err,
      );
    });
};