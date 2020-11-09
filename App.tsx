import {
  Animated,
  FlatList,
  LayoutChangeEvent,
  NativeScrollEvent,
  NativeSyntheticEvent,
  PanResponder,
  StyleSheet,
  Text,
  View,
} from "react-native";
import React, { Component } from "react";

type Item = {
  id: number;
  value: string;
};

interface IProps {}

interface IState {
  isDragging: boolean;
  dragItemIndex: number;
}

// console.warn = () => {}; // to remove console warnings when debugging code

/**
 * Generates an array with 15 string items that contains a random hex code.
 */
const generateColors = () => {
  const colors = [];
  const letters = "0123456789ABCDEF";

  for (let i = 0; i < 15; i++) {
    let color = "#";

    for (let j = 0; j < 6; j++) {
      color += letters[Math.floor(Math.random() * 16)];
    }

    colors.push(color);
  }

  return colors;
};

/**
 * Generates an array with 15 items that contains objects.
 */
const generateArray = () => {
  let data = [];

  for (let index = 1; index < 16; index++) {
    data.push({
      id: index,
      value: index.toString(),
    });
  }

  return data;
};

/**
 * Item background colors array.
 */
const colors = generateColors();

// As "SafeAreaView" is no longer supported by React Native
// non-responsive top margin is defined to leave space for
// status bar at the top of the screen
const marginTop = 55;

const dragItemCoordinatesInitialValue = {
  x: 0,
  y: 0,
};

const currentIndexInitialValue = -1;

/**
 * App is a component that renders a list of items that can
 * be ordered manually by drag & drop functionality.
 */
class App extends Component<IProps, IState> {
  state: IState = {
    isDragging: false,
    dragItemIndex: -1,
  };

  constructor(props: IProps) {
    super(props);
  }

  /**
   * Items to render FlatList with.
   */
  data = generateArray();

  flatListRef = React.createRef<FlatList<Item>>();

  /**
   * FlatList height.
   */
  flatListHeight = 0;

  /**
   * Item height in FlatList.
   */
  flatListItemHeight = 0;

  /**
   * Scroll current position.
   */
  scrollOffset = 0;

  /**
   * Dragging item current position.
   */
  dragItemCoordinates = new Animated.ValueXY(dragItemCoordinatesInitialValue);

  /**
   * Dragging item current position between other items
   */
  currentIndex = currentIndexInitialValue;

  /**
   * Dragging item current Y position.
   */
  currentY = 0;

  /**
   * Returns the current index based on its current Y position.
   * @param y - dragging item current Y position.
   */
  getIndex = (y: number) => {
    const index = Math.floor(
      (y - marginTop + this.scrollOffset) / this.flatListItemHeight
    );

    // Index cannot be out of bounds
    if (index > this.data.length - 1) {
      return this.data.length - 1;
    } else if (index < 0) {
      return 0;
    } else {
      return index;
    }
  };

  /**
   * Resets everything back to initial values and states.
   */
  reset = () => {
    this.currentIndex = currentIndexInitialValue;

    this.dragItemCoordinates.setValue(dragItemCoordinatesInitialValue);

    this.setState({
      isDragging: false,
      dragItemIndex: -1,
    });
  };

  /**
   * FlatList item reordering helper method.
   * @param index - next or previous item position from dragging item current position.
   */
  reorder = (index: number) => {
    const newData = this.data; // create a temporary array with data values in it
    const dragItemData = newData[this.currentIndex]; // get dragging item data

    newData.splice(this.currentIndex, 1); // remove dragging item data from temporary array to move other values up
    newData.splice(index, 0, dragItemData); // add dragging item data to temporary array in a new position

    this.data = newData; // save temporary array to data array
  };

  /**
   * Reorders items in FlatList.
   */
  onReorder = () => {
    const newIndex = this.getIndex(this.currentY);

    // Only reorder if dragging item new current position
    // is not the same as previous current position
    if (newIndex !== this.currentIndex) {
      this.reorder(newIndex);

      this.currentIndex = newIndex;

      this.setState({
        dragItemIndex: this.currentIndex,
      });
    }
  };

  /**
   * Creates a scroll threshold which scrolls up or down
   * when threshold is active.
   */
  onScrollThreshold = () => {
    if (this.flatListRef.current) {
      const scrollSpeed = 5;

      if (this.currentY + 100 > this.flatListHeight) {
        this.flatListRef.current.scrollToOffset({
          offset: this.scrollOffset + scrollSpeed,
          animated: false,
        });
      } else if (this.currentY < 100 + marginTop) {
        this.flatListRef.current.scrollToOffset({
          offset: this.scrollOffset - scrollSpeed,
          animated: false,
        });
      }
    }
  };

  /**
   * Checks for scroll threshold and FlatList item reordering
   * while dragging.
   */
  onDrag = () => {
    requestAnimationFrame(() => {
      if (!this.state.isDragging) {
        return;
      }

      this.onScrollThreshold();

      this.onReorder();

      this.onDrag();
    });
  };

  panResponder = PanResponder.create({
    // Ask to be the responder
    onStartShouldSetPanResponder: (event, gestureState) => true,
    onStartShouldSetPanResponderCapture: (event, gestureState) => true,
    onMoveShouldSetPanResponder: (event, gestureState) => true,
    onMoveShouldSetPanResponderCapture: (event, gestureState) => true,

    /**
     * The gesture has started. Show visual feedback so the user knows
     * what is happening!
     * gestureState.d{x,y} will be set to zero now
     */
    onPanResponderGrant: (event, gestureState) => {
      this.currentIndex = this.getIndex(gestureState.y0); // get dragging item current position between other items

      this.currentY = gestureState.y0; // get dragging item current Y position

      this.dragItemCoordinates.setOffset({
        x: 0,
        y: this.currentIndex * this.flatListItemHeight - this.scrollOffset,
      }); // set offset to responding FlatList item

      // Update state that dragging is active, update dragging item index and
      // call "onDrag" method
      this.setState(
        {
          isDragging: true,
          dragItemIndex: this.currentIndex,
        },
        () => this.onDrag()
      );
    },

    /**
     * The most recent move distance is gestureState.move{X,Y}
     * The accumulated gesture distance since becoming responder is
     * gestureState.d{x,y}
     */
    onPanResponderMove: (event, gestureState) => {
      this.currentY = gestureState.moveY; // get dragging item current Y position

      Animated.event([null, { dy: this.dragItemCoordinates.y }])(
        event,
        gestureState
      );
    },

    onPanResponderTerminationRequest: (event, gestureState) => false,

    /**
     * The user has released all touches while this view is the
     * responder. This typically means a gesture has succeeded
     */
    onPanResponderRelease: (event, gestureState) => {
      this.reset();
    },

    /**
     * Another component has become the responder, so this gesture
     * should be cancelled
     */
    onPanResponderTerminate: (event, gestureState) => {
      this.reset();
    },

    /**
     * Returns whether this component should block native components from becoming the JS
     * responder. Returns true by default. Is currently only supported on android.
     */
    onShouldBlockNativeResponder: (event, gestureState) => {
      return true;
    },
  });

  /**
   * Get FlatList height
   * @param event - LayoutChangeEvent
   */
  handleFlatListLayout = (event: LayoutChangeEvent) => {
    this.flatListHeight = event.nativeEvent.layout.height;
  };

  // Get FlatList item height
  /**
   * Get FlatList item height
   * @param event - LayoutChangeEvent
   */
  handleItemLayout = (event: LayoutChangeEvent) => {
    const { height } = event.nativeEvent.layout;

    if (this.flatListItemHeight !== height) {
      this.flatListItemHeight = height;
    }
  };

  /**
   * Get scroll current position
   * @param event - NativeSyntheticEvent
   */
  handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    this.scrollOffset = event.nativeEvent.contentOffset.y;
  };

  render() {
    const { isDragging } = this.state;

    /**
     * Renders one instance of FlatList item
     * @param item - item of the data
     * @param index - index of the item (optional)
     * @param notDraggableItem - boolean value to indicate if it is a draggable item
     */
    const renderItem = (
      { item, index }: { item: Item; index?: number },
      notDraggableItem = true
    ) => {
      return (
        <View
          key={item.id}
          style={[
            styles.flatListItemContainer,
            { backgroundColor: colors[item.id - 1] },
            notDraggableItem &&
              index === this.currentIndex &&
              styles.activeFlatListItemContainer,
          ]}
          onLayout={this.handleItemLayout}
        >
          <View
            {...this.panResponder.panHandlers}
            style={styles.flatListDragIndicatorContainer}
          >
            <Text style={styles.flatListDragIndicatorText}>+</Text>
          </View>
          <View style={styles.flatListTextContainer}>
            <Text style={styles.flatListItemText}>{item.value}</Text>
          </View>
        </View>
      );
    };

    /**
     * Renders a copy of FlatList item as dragging item
     */
    const renderDragItem = () => {
      return (
        <Animated.View
          style={[
            styles.dragItemContainer,
            {
              top: this.dragItemCoordinates.getLayout().top,
            },
          ]}
        >
          {renderItem(
            {
              item: this.data[this.state.dragItemIndex],
            },
            false
          )}
        </Animated.View>
      );
    };

    return (
      <View style={styles.container}>
        {isDragging && renderDragItem()}
        <FlatList
          style={styles.flatListContainer}
          ref={this.flatListRef}
          data={this.data}
          renderItem={renderItem}
          keyExtractor={(item) => item.id.toString()}
          onLayout={this.handleFlatListLayout}
          scrollEnabled={!isDragging}
          onScroll={this.handleScroll}
        />
      </View>
    );
  }
}

export default App;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    marginTop,
  },
  flatListContainer: {},
  flatListItemContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 20,
  },
  activeFlatListItemContainer: {
    opacity: 0,
  },
  flatListDragIndicatorContainer: {
    position: "absolute",
    padding: 5,
    zIndex: 1,
  },
  flatListDragIndicatorText: {
    fontSize: 28,
  },
  flatListTextContainer: {
    flex: 1,
    alignItems: "center",
    marginHorizontal: 35,
  },
  flatListItemText: {
    fontSize: 22,
  },
  dragItemContainer: {
    position: "absolute",
    width: "100%",
    zIndex: 1,
    elevation: 2,
  },
});
