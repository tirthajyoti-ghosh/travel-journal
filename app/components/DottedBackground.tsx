import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import Svg, { Circle, Defs, Pattern, Rect } from 'react-native-svg';

const { width, height } = Dimensions.get('window');

interface DottedBackgroundProps {
  dotColor?: string;
  dotSize?: number;
  spacing?: number;
}

export const DottedBackground: React.FC<DottedBackgroundProps> = ({
  dotColor = '#E2D9CA',
  dotSize = 1.5,
  spacing = 24,
}) => {
  return (
    <View style={styles.container}>
      <Svg width={width} height={height * 2} style={styles.svg}>
        <Defs>
          <Pattern
            id="dotPattern"
            patternUnits="userSpaceOnUse"
            width={spacing}
            height={spacing}
          >
            <Circle
              cx={spacing / 2}
              cy={spacing / 2}
              r={dotSize}
              fill={dotColor}
            />
          </Pattern>
        </Defs>
        <Rect width="100%" height="100%" fill="url(#dotPattern)" />
      </Svg>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 0,
  },
  svg: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
});
