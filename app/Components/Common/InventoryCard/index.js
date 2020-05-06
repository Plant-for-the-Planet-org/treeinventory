
import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacit } from 'react-native';
import { Colors, Typography } from '_styles';
import { back_icon, close, upload_now, tree } from '../../../assets'

const InventoryCard = ({ data }) => {
    return (
        <View style={{ height: 130, flexDirection: 'row', backgroundColor: Colors.WHITE, marginVertical: 10 }}>
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <Image source={tree} resizeMode={'stretch'} />
            </View>
            <View style={{ flex: 1.2, justifyContent: 'space-evenly', marginHorizontal: 20 }}>
                <Text style={styles.subHeadingText}>{data.title}</Text>
                <Text style={styles.subHeadingText}>{data.measurement}</Text>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={styles.subHeadingText}>{data.date}</Text>
                    <Image source={upload_now} />
                </View>
            </View>
        </View>
    )
}
export default InventoryCard;

const styles = StyleSheet.create({
    headerText: {
        fontFamily: Typography.FONT_FAMILY_REGULAR,
        fontSize: Typography.FONT_SIZE_27,
        lineHeight: Typography.LINE_HEIGHT_40,
        color: Colors.TEXT_COLOR,
        fontWeight: Typography.FONT_WEIGHT_BOLD
    },
    subHeadingText: {
        fontFamily: Typography.FONT_FAMILY_REGULAR,
        fontSize: Typography.FONT_SIZE_16,
        lineHeight: Typography.LINE_HEIGHT_24,
        color: Colors.TEXT_COLOR,
        fontWeight: Typography.FONT_WEIGHT_REGULAR,
    },
    activeText: {
        color: Colors.PRIMARY,
    },
    uploadNowBtn: {
        fontFamily: Typography.FONT_FAMILY_REGULAR,
        fontSize: Typography.FONT_SIZE_16,
        lineHeight: Typography.LINE_HEIGHT_24,
        fontWeight: Typography.FONT_WEIGHT_REGULAR,
        paddingHorizontal: 10
    }
})




