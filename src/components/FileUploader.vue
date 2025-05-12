<template>
  <div class="file-uploader" @dragover.prevent @drop.prevent="handleDrop">
    <input
      type="file"
      multiple
      accept="image/*"
      ref="fileInput"
      @change="handleFileSelect"
      hidden
    />
    <div class="upload-area" @click="triggerFileInput">
      <p>Upload images for contact sheet here</p>
      <p>Drag and drop images here, or click to select files</p>
    </div>
    <div class="controls">
      <div class="user-input">
        <label for="max-size">Max Image Size (px):</label>
        <input
          id="max-size"
          type="number"
          v-model.number="maxSize"
          min="50"
          @change="setPxSize"
        />
      </div>
      <div class="user-input">
        <label for="bg-color">Background Color:</label>
        <input
          id="bg-color"
          type="color"
          v-model="backgroundColor"
        />
      </div>
      <div class="sort-options">
        <p>Sort Order:</p>
        <label>
          <input
            type="radio"
            value="keep"
            v-model="sortOrder"
            @change="setSortOrder"
          />
          <span>Keep Order</span>
        </label>
        <label>
          <input
            type="radio"
            value="landscape"
            v-model="sortOrder"
            @change="setSortOrder"
          />
          <span>Landscape First</span>
        </label>
        <label>
          <input
            type="radio"
            value="portrait"
            v-model="sortOrder"
            @change="setSortOrder"
          />
          <span>Portrait First</span>
        </label>
      </div>
      <div class="action-buttons">
        <button @click="generateContactSheet" :disabled="!files.length || isLoading" style="margin-bottom: 1rem;">
          Generate Contact Sheet
        </button>
        <button @click="clearImages" :disabled="!files.length || isLoading">
          Clear Images
        </button>
      </div>
    </div>

    <!-- Loading Indicator -->
    <div v-if="isLoading" class="loading-indicator">
      <p>Generating contact sheet, please wait...</p>
    </div>

    <!-- Contact Sheet Preview -->
    <div v-if="previewUrl && !isLoading" class="preview-container">
      <div class="preview">
        <div class="preview-text">
          <h2>Contact Sheet Preview:</h2>
          <button class="download-button" @click="downloadContactSheet">
            Download Contact Sheet
          </button>
        </div>
        <img :src="previewUrl" alt="Contact Sheet Preview" />
      </div>
    </div>

    <!-- Image Thumbnails -->
    <draggable
      v-model="files"
      class="file-list"
      :itemKey="'name'"
      :disabled="!files.length"
    >
      <template #item="{ element }">
        <div class="file-item">
          <img :src="element.thumbnail" alt="Thumbnail" class="thumbnail" />
          <span>{{ element.name }}</span>
        </div>
      </template>
    </draggable>

    <canvas ref="canvas" style="display: none;"></canvas>
  </div>
</template>

<script>
import draggable from "vuedraggable";

export default {
  name: "FileUploader",
  components: {
    draggable,
  },
  data() {
    return {
      files: [],
      maxSize: 300, // Default max size for images
      backgroundColor: "#ffffff", // Default background color
      previewUrl: null, // URL for the preview image
      sortOrder: "keep", // Default sort order
      isLoading: false, // Loading state
    };
  },
  methods: {
    setSortOrder(event) {
      localStorage.setItem("DIGITAL_CONTACT_SHEET_SORT_ORDER", this.sortOrder);
    },
    setPxSize(event) {
      localStorage.setItem("DIGITAL_CONTACT_SHEET_MAX_SIZE", this.maxSize);
    },
    handleDrop(event) {
      const droppedFiles = Array.from(event.dataTransfer.files).filter(
        (file) => file.type.startsWith("image/")
      );
      this.addFiles(droppedFiles);
    },
    handleFileSelect(event) {
      const selectedFiles = Array.from(event.target.files).filter((file) =>
        file.type.startsWith("image/")
      );
      this.addFiles(selectedFiles);
    },
    addFiles(files) {
      files.forEach((file) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          this.files.push({
            file,
            name: file.name,
            thumbnail: e.target.result,
          });
        };
        reader.readAsDataURL(file);
      });
    },
    triggerFileInput() {
      this.$refs.fileInput.click();
    },
    async generateContactSheet() {
      this.isLoading = true; // Start loading
      const canvas = this.$refs.canvas;
      const ctx = canvas.getContext("2d");

      const padding = 20; // Padding around the canvas and between images
      const imagesPerRow = 5; // Max images per row

      // Ensure all images are loaded and resized
      const resizedImages = await Promise.all(
        this.files.map(async (fileObj) => {
          const img = await this.loadImage(fileObj.file); // Ensure image is fully loaded
          const resized = this.resizeImage(img, this.maxSize); // Resize the image
          return { img: resized, aspectRatio: img.width / img.height };
        })
      );

      // Sort images based on the selected sort order
      if (this.sortOrder === "landscape") {
        resizedImages.sort((a, b) => b.aspectRatio - a.aspectRatio); // Landscape first
      } else if (this.sortOrder === "portrait") {
        resizedImages.sort((a, b) => a.aspectRatio - b.aspectRatio); // Portrait first
      }

      // Calculate canvas dimensions
      const rowCount = Math.ceil(resizedImages.length / imagesPerRow);
      const canvasWidth =
        imagesPerRow * this.maxSize + (imagesPerRow + 1) * padding;
      const canvasHeight =
        rowCount * this.maxSize + (rowCount + 1) * padding;

      canvas.width = canvasWidth;
      canvas.height = canvasHeight;

      // Fill canvas background with the selected color
      ctx.fillStyle = this.backgroundColor;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw images on canvas
      resizedImages.forEach(({ img }, index) => {
        const row = Math.floor(index / imagesPerRow);
        const col = index % imagesPerRow;

        // Calculate the starting x and y positions for centering
        const totalRowWidth =
          Math.min(imagesPerRow, resizedImages.length - row * imagesPerRow) *
          (this.maxSize + padding) -
          padding;
        const xOffset = (canvasWidth - totalRowWidth) / 2;

        const x = xOffset + col * (this.maxSize + padding);
        const y = padding + row * (this.maxSize + padding);

        // Center the image within its allocated space
        const centeredX = x + (this.maxSize - img.width) / 2;
        const centeredY = y + (this.maxSize - img.height) / 2;

        ctx.drawImage(img, centeredX, centeredY, img.width, img.height);
      });

      // Generate preview URL
      this.previewUrl = canvas.toDataURL("image/png");
      this.isLoading = false; // Stop loading
    },
    downloadContactSheet() {
      const link = document.createElement("a");
      link.href = this.previewUrl;
      link.download = "contact-sheet.png";
      link.click();
    },
    loadImage(file) {
      return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.src = URL.createObjectURL(file);
      });
    },
    resizeImage(img, maxSize) {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");

      const aspectRatio = img.width / img.height;
      if (img.width > img.height) {
        canvas.width = maxSize;
        canvas.height = maxSize / aspectRatio;
      } else {
        canvas.height = maxSize;
        canvas.width = maxSize * aspectRatio;
      }

      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      const resizedImg = new Image();
      resizedImg.src = canvas.toDataURL();
      return resizedImg;
    },
    clearImages() {
      this.files = [];
      this.previewUrl = null;
    },
    getLocalStorage() {
        const localMaxSize = localStorage.getItem("DIGITAL_CONTACT_SHEET_MAX_SIZE");
        if (localMaxSize) this.maxSize = parseInt(localMaxSize, 10);

        const localSortOrder = localStorage.getItem("DIGITAL_CONTACT_SHEET_SORT_ORDER");
        if (localSortOrder) this.sortOrder = localSortOrder;
    },
  },
    mounted() {
        this.getLocalStorage();
    },
};
</script>

<style scoped>
.file-uploader {
  border: 2px dashed #ccc;
  border-radius: 8px;
  padding: 20px;
  text-align: center;
  cursor: pointer;
}
.upload-area {
  padding: 20px;
  background-color: #e0e0e0;
  border-radius: 8px;
  color: #333;
}
.upload-area:hover {
  background-color: #d6d6d6;
}
.controls {
  margin-top: 20px;
}
.controls label {
  margin-right: 10px;
}
.controls input {
  width: 80px;
  margin-right: 10px;
}
.action-buttons {
  margin-top: 10px;
}
.action-buttons button {
  margin-right: 10px; /* Add spacing between buttons */
}
.controls button {
  padding: 5px 10px;
  background-color: #42b883;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}
.controls button:disabled {
  background-color: #ccc;
  cursor: not-allowed;
}
.sort-options {
  margin-top: 10px;
}
.sort-options p {
  margin-bottom: 5px;
}
.sort-options label {
  margin-right: 15px;
  display: flex;
  align-items: center;
}
.sort-options input {
  margin-right: 5px; /* Add spacing between radio button and label */
}
.file-list {
  margin-top: 20px;
}
.file-item {
  display: flex;
  align-items: center;
  margin-bottom: 10px;
}
.thumbnail {
  width: 50px;
  height: 50px;
  object-fit: cover;
  margin-right: 10px;
  border: 1px solid #ccc;
  border-radius: 4px;
}
.preview-container {
  display: flex;
  align-items: center;
  justify-content: flex-start; /* Align items to the left */
  margin-top: 20px;
  gap: 20px; /* Add spacing between the button and the preview text */
}
.preview img {
  max-width: 100%;
  border: 1px solid #ccc;
  border-radius: 8px;
}
.download-button {
  padding: 5px 10px;
  background-color: #42b883;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}
.preview-text {
  display: flex;
  flex-direction: row;
  align-items: flex-start; /* Align text to the left */
  align-items: center;
  justify-content: space-between;
}
.loading-indicator {
  text-align: center;
  margin-top: 20px;
  font-size: 1.2em;
  color: #42b883;
}
</style>