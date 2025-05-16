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

<script lang="ts">
import { defineComponent, ref, onMounted } from "vue";
import draggable from "vuedraggable";

interface FileItem {
  file: File;
  name: string;
  thumbnail: string;
}

export default defineComponent({
  name: "FileUploader",
  components: {
    draggable,
  },
  setup() {
    const fileInput = ref<HTMLInputElement | null>(null);
    const canvas = ref<HTMLCanvasElement | null>(null);
    const files = ref<FileItem[]>([]);
    const maxSize = ref<number>(300);
    const backgroundColor = ref<string>("#ffffff");
    const previewUrl = ref<string | null>(null);
    const sortOrder = ref<"keep" | "landscape" | "portrait">("keep");
    const isLoading = ref<boolean>(false);

    const setSortOrder = () => {
      localStorage.setItem("DIGITAL_CONTACT_SHEET_SORT_ORDER", sortOrder.value);
    };

    const setPxSize = () => {
      localStorage.setItem("DIGITAL_CONTACT_SHEET_MAX_SIZE", maxSize.value.toString());
    };

    const handleDrop = (event: DragEvent) => {
      const droppedFiles = Array.from(event.dataTransfer?.files || []).filter((file) =>
        file.type.startsWith("image/")
      );
      addFiles(droppedFiles);
    };

    const handleFileSelect = (event: Event) => {
      const input = event.target as HTMLInputElement;
      const selectedFiles = Array.from(input.files || []).filter((file) =>
        file.type.startsWith("image/")
      );
      addFiles(selectedFiles);
    };

    const addFiles = (newFiles: File[]) => {
      newFiles.forEach((file) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          files.value.push({
            file,
            name: file.name,
            thumbnail: e.target?.result as string,
          });
        };
        reader.readAsDataURL(file);
      });
    };

    const triggerFileInput = () => {
      fileInput.value?.click();
    };

    const generateContactSheet = async () => {
      if (!canvas.value) return;
      isLoading.value = true;

      const ctx = canvas.value.getContext("2d");
      const padding = 20;
      const imagesPerRow = 5;

      try {
        // Ensure all images are loaded and resized
        const resizedImages = await Promise.all(
          files.value.map(async (fileObj) => {
            const img = await loadImage(fileObj.file); // Ensure image is fully loaded
            const resized = await resizeImage(img, maxSize.value); // Resize the image
            return { img: resized, aspectRatio: img.width / img.height };
          })
        );

        // Sort images based on the selected sort order
        if (sortOrder.value === "landscape") {
          resizedImages.sort((a, b) => b.aspectRatio - a.aspectRatio); // Landscape first
        } else if (sortOrder.value === "portrait") {
          resizedImages.sort((a, b) => a.aspectRatio - b.aspectRatio); // Portrait first
        }

        // Calculate canvas dimensions
        const rowCount = Math.ceil(resizedImages.length / imagesPerRow);
        const canvasWidth =
          imagesPerRow * maxSize.value + (imagesPerRow + 1) * padding;
        const canvasHeight =
          rowCount * maxSize.value + (rowCount + 1) * padding;

        canvas.value.width = canvasWidth;
        canvas.value.height = canvasHeight;

        // Fill canvas background with the selected color
        ctx!.fillStyle = backgroundColor.value;
        ctx!.fillRect(0, 0, canvasWidth, canvasHeight);

        // Draw images on canvas
        resizedImages.forEach(({ img }, index) => {
          const row = Math.floor(index / imagesPerRow);
          const col = index % imagesPerRow;

          const totalRowWidth =
            Math.min(imagesPerRow, resizedImages.length - row * imagesPerRow) *
            (maxSize.value + padding) -
            padding;
          const xOffset = (canvasWidth - totalRowWidth) / 2;

          const x = xOffset + col * (maxSize.value + padding);
          const y = padding + row * (maxSize.value + padding);

          const centeredX = x + (maxSize.value - img.width) / 2;
          const centeredY = y + (maxSize.value - img.height) / 2;

          ctx!.drawImage(img, centeredX, centeredY, img.width, img.height);
        });

        // Log resized images and canvas dimensions
        console.log("Resized Images:", resizedImages);
        console.log("Canvas Dimensions:", { width: canvasWidth, height: canvasHeight });

        // Generate preview URL
        previewUrl.value = canvas.value.toDataURL("image/png");
      } catch (error) {
        console.error("Error generating contact sheet:", error);
      } finally {
        isLoading.value = false;
      }
    };

    const downloadContactSheet = () => {
      const link = document.createElement("a");
      link.href = previewUrl.value!;
      link.download = "contact-sheet.png";
      link.click();
    };

    const loadImage = (file: File): Promise<HTMLImageElement> => {
      return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error(`Failed to load image: ${file.name}`));
        img.src = URL.createObjectURL(file);
      });
    };

    const resizeImage = async (img: HTMLImageElement, maxSize: number): Promise<HTMLImageElement> => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d")!;
      const aspectRatio = img.width / img.height;

      if (img.width > img.height) {
        canvas.width = maxSize;
        canvas.height = maxSize / aspectRatio;
      } else {
        canvas.height = maxSize;
        canvas.width = maxSize * aspectRatio;
      }

      await new Promise<void>((resolve) => {
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve();
      });

      const resizedImg = await new Promise<HTMLImageElement>((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error("Failed to create resized image"));
        img.src = canvas.toDataURL();
      });
      return resizedImg;
    };

    const clearImages = () => {
      files.value = [];
      previewUrl.value = null;
    };

    const getLocalStorage = () => {
      const localMaxSize = localStorage.getItem("DIGITAL_CONTACT_SHEET_MAX_SIZE");
      if (localMaxSize) maxSize.value = parseInt(localMaxSize, 10);

      const localSortOrder = localStorage.getItem("DIGITAL_CONTACT_SHEET_SORT_ORDER");
      if (localSortOrder) sortOrder.value = localSortOrder as "keep" | "landscape" | "portrait";
    };

    onMounted(() => {
      getLocalStorage();
    });

    return {
      fileInput,
      canvas,
      files,
      maxSize,
      backgroundColor,
      previewUrl,
      sortOrder,
      isLoading,
      setSortOrder,
      setPxSize,
      handleDrop,
      handleFileSelect,
      addFiles,
      triggerFileInput,
      generateContactSheet,
      downloadContactSheet,
      loadImage,
      resizeImage,
      clearImages,
      getLocalStorage,
    };
  },
});
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