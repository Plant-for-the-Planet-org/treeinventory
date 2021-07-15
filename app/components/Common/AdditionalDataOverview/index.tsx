import i18next from 'i18next';
import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Colors, Typography } from '../../../styles';
import { additionalDataForUI, getFormattedMetadata } from '../../../utils/additionalData/functions';
import { INCOMPLETE, INCOMPLETE_SAMPLE_TREE } from '../../../utils/inventoryConstants';

interface Props {
  data: any;
  isSampleTree?: boolean;
}

const AdditionalDataOverview = ({ data, isSampleTree = false }: Props) => {
  const [metadata, setMetadata] = useState<any>(null);

  useEffect(() => {
    let appAdditionalDetails = [];
    appAdditionalDetails = additionalDataForUI({
      data,
      isSampleTree,
    });
    let additionalDetails;
    if (data) {
      additionalDetails = [...appAdditionalDetails, ...data.additionalDetails];
    }
    if (additionalDetails && additionalDetails.length > 0) {
      setMetadata(getFormattedMetadata(additionalDetails));
    } else {
      setMetadata(null);
    }
  }, [data]);

  if (metadata && Object.keys(metadata).length > 0) {
    return (
      <>
        {Object.keys(metadata).map((dataKey: string) => {
          if (metadata[dataKey] && Object.keys(metadata[dataKey]).length > 0) {
            return (
              <View style={styles.subDataContainer} key={dataKey}>
                <Text style={styles.keyHeading}>{i18next.t(`label.${dataKey}`)}</Text>
                {Object.entries(metadata[dataKey]).map(([key, value]: any, index: number) => {
                  return (
                    <View style={styles.keyValueContainer} key={`${key}-${index}`}>
                      <Text style={styles.keyText}>{key}</Text>
                      <Text style={styles.valueText}>{value}</Text>
                    </View>
                  );
                })}
              </View>
            );
          }
        })}
      </>
    );
  }
  return (
    <View style={styles.noDataContainer}>
      <Text style={styles.noDataText}>{i18next.t('label.no_additional_data_available')}</Text>
    </View>
  );
};

export default AdditionalDataOverview;

const styles = StyleSheet.create({
  subDataContainer: {
    borderWidth: 1,
    borderColor: Colors.GRAY_LIGHT,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingTop: 4,
    marginBottom: 24,
  },
  keyHeading: {
    fontSize: Typography.FONT_SIZE_14,
    fontFamily: Typography.FONT_FAMILY_SEMI_BOLD,
    color: Colors.TEXT_COLOR,
    paddingTop: 4,
  },
  keyValueContainer: {
    borderRadius: 6,
    backgroundColor: Colors.GRAY_LIGHT,
    padding: 8,
    paddingTop: 4,
    marginVertical: 8,
  },
  keyText: {
    fontSize: Typography.FONT_SIZE_12,
    fontFamily: Typography.FONT_FAMILY_SEMI_BOLD,
    color: Colors.TEXT_COLOR,
    paddingVertical: 4,
    marginBottom: 4,
  },
  valueText: {
    fontSize: Typography.FONT_SIZE_14,
    fontFamily: Typography.FONT_FAMILY_REGULAR,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
    backgroundColor: Colors.WHITE,
  },
  noDataContainer: {
    backgroundColor: Colors.GRAY_LIGHT,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 6,
    marginBottom: 40,
  },
  noDataText: {
    fontSize: Typography.FONT_SIZE_16,
    fontFamily: Typography.FONT_FAMILY_REGULAR,
    color: Colors.TEXT_COLOR,
    fontStyle: 'italic',
  },
});
