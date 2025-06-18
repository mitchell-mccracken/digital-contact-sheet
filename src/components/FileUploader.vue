<template>
  <div id="app">
    <!-- Existing content -->
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
            @change="setBackgroundColor"
          />
        </div>
        <div class="user-input">
          <label for="file-name">Contact Sheet Name:</label>
          <input
            id="file-name"
            type="text"
            v-model="fileName"
            placeholder="Enter file name (optional)"
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
          <!-- TAKEN OUT, ONLY FOR DEV PURPOSES -->
          <button v-if="false" @click="generateFilmStripContactSheet" :disabled="!files.length || isLoading">
            Generate Film Strip Contact Sheet
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
        :disabled="!files.length || disableDraggable"
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

    <!-- Footer -->
    <footer class="page-footer">
      <a href="https://buymeacoffee.com/mitchmccracken" target="_blank" rel="noopener noreferrer" title="buy me a coffee">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-cup-hot-fill" viewBox="0 0 16 16">
          <path fill-rule="evenodd" d="M.5 6a.5.5 0 0 0-.488.608l1.652 7.434A2.5 2.5 0 0 0 4.104 16h5.792a2.5 2.5 0 0 0 2.44-1.958l.131-.59a3 3 0 0 0 1.3-5.854l.221-.99A.5.5 0 0 0 13.5 6zM13 12.5a2 2 0 0 1-.316-.025l.867-3.898A2.001 2.001 0 0 1 13 12.5"/>
          <path d="m4.4.8-.003.004-.014.019a4 4 0 0 0-.204.31 2 2 0 0 0-.141.267c-.026.06-.034.092-.037.103v.004a.6.6 0 0 0 .091.248c.075.133.178.272.308.445l.01.012c.118.158.26.347.37.543.112.2.22.455.22.745 0 .188-.065.368-.119.494a3 3 0 0 1-.202.388 5 5 0 0 1-.253.382l-.018.025-.005.008-.002.002A.5.5 0 0 1 3.6 4.2l.003-.004.014-.019a4 4 0 0 0 .204-.31 2 2 0 0 0 .141-.267c.026-.06.034-.092.037-.103a.6.6 0 0 0-.09-.252A4 4 0 0 0 3.6 2.8l-.01-.012a5 5 0 0 1-.37-.543A1.53 1.53 0 0 1 3 1.5c0-.188.065-.368.119-.494.059-.138.134-.274.202-.388a6 6 0 0 1 .253-.382l.025-.035A.5.5 0 0 1 4.4.8m3 0-.003.004-.014.019a4 4 0 0 0-.204.31 2 2 0 0 0-.141.267c-.026.06-.034.092-.037.103v.004a.6.6 0 0 0 .091.248c.075.133.178.272.308.445l.01.012c.118.158.26.347.37.543.112.2.22.455.22.745 0 .188-.065.368-.119.494a3 3 0 0 1-.202.388 5 5 0 0 1-.253.382l-.018.025-.005.008-.002.002A.5.5 0 0 1 6.6 4.2l.003-.004.014-.019a4 4 0 0 0 .204-.31 2 2 0 0 0 .141-.267c.026-.06.034-.092.037-.103a.6.6 0 0 0-.09-.252A4 4 0 0 0 6.6 2.8l-.01-.012a5 5 0 0 1-.37-.543A1.53 1.53 0 0 1 6 1.5c0-.188.065-.368.119-.494.059-.138.134-.274.202-.388a6 6 0 0 1 .253-.382l.025-.035A.5.5 0 0 1 7.4.8m3 0-.003.004-.014.019a4 4 0 0 0-.204.31 2 2 0 0 0-.141.267c-.026.06-.034.092-.037.103v.004a.6.6 0 0 0 .091.248c.075.133.178.272.308.445l.01.012c.118.158.26.347.37.543.112.2.22.455.22.745 0 .188-.065.368-.119.494a3 3 0 0 1-.202.388 5 5 0 0 1-.252.382l-.019.025-.005.008-.002.002A.5.5 0 0 1 9.6 4.2l.003-.004.014-.019a4 4 0 0 0 .204-.31 2 2 0 0 0 .141-.267c.026-.06.034-.092.037-.103a.6.6 0 0 0-.09-.252A4 4 0 0 0 9.6 2.8l-.01-.012a5 5 0 0 1-.37-.543A1.53 1.53 0 0 1 9 1.5c0-.188.065-.368.119-.494.059-.138.134-.274.202-.388a6 6 0 0 1 .253-.382l.025-.035A.5.5 0 0 1 10.4.8"/>
        </svg>
      </a>
      <a href="https://github.com/mitchell-mccracken/digital-contact-sheet" target="_blank" rel="noopener noreferrer">
        <svg class="icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 0C5.37 0 0 5.37 0 12c0 5.3 3.438 9.8 8.205 11.385.6.11.82-.26.82-.577v-2.234c-3.338.726-4.042-1.61-4.042-1.61-.546-1.387-1.333-1.756-1.333-1.756-1.09-.745.083-.73.083-.73 1.205.084 1.84 1.237 1.84 1.237 1.07 1.835 2.807 1.305 3.492.997.108-.774.42-1.305.763-1.605-2.665-.305-5.467-1.332-5.467-5.93 0-1.31.468-2.38 1.235-3.22-.123-.303-.535-1.523.117-3.176 0 0 1.007-.322 3.3 1.23a11.5 11.5 0 013.003-.404c1.02.005 2.045.138 3.003.404 2.29-1.552 3.297-1.23 3.297-1.23.653 1.653.241 2.873.118 3.176.77.84 1.235 1.91 1.235 3.22 0 4.61-2.807 5.623-5.478 5.92.43.37.823 1.102.823 2.222v3.293c0 .32.22.694.825.576C20.565 21.795 24 17.295 24 12 24 5.37 18.63 0 12 0z" />
        </svg>
      </a>
      <span>by Mitch McCracken</span>
    </footer>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, onMounted } from "vue";
import draggable from "vuedraggable";

interface FileItem {
  file: File;
  name: string;
  thumbnail: string;
  imgNumber: string;
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
    const disableDraggable = ref<boolean>(false);
    const fileName = ref<string>(""); // Default to an empty string

    const setSortOrder = () => {
      localStorage.setItem("DIGITAL_CONTACT_SHEET_SORT_ORDER", sortOrder.value);
    };

    const setPxSize = () => {
      localStorage.setItem("DIGITAL_CONTACT_SHEET_MAX_SIZE", maxSize.value.toString());
    };

    const setBackgroundColor = () => {
      localStorage.setItem("DIGITAL_CONTACT_SHEET_BACKGROUND_COLOR", backgroundColor.value);
    };

    // not use
    const setAsFavorite = () => {
      // Search for existing keys in localStorage that match the format DIGITAL_CONTACT_SHEET_COLOR_FAVORITE_#
      const keys = Object.keys(localStorage).filter(key =>
      /^DIGITAL_CONTACT_SHEET_COLOR_FAVORITE_\d+$/.test(key)
      );

      // Determine the next available index
      const nextIndex = keys.length > 0
      ? Math.max(...keys.map(key => parseInt(key.match(/\d+$/)?.[0] || "0", 10))) + 1
      : 1;

      // Save the current background color as a favorite with the next available index
      localStorage.setItem(`DIGITAL_CONTACT_SHEET_COLOR_FAVORITE_${nextIndex}`, backgroundColor.value);
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

    const genImgNumber = ( s: string ) => {
      const a = s.split('(');
      if ( a.length === 1 ) {
        a.push('0');
      }

      const convert = (s:string) => {
        return s.split('')
          .map(char => {
            if (/\d/.test(char)) return char;
            return '';
          })
          .join('');
      }

      const wholeNum = convert(a[0]);
      let decimal = convert(a[1]);
      if ( decimal.length === 1 ) decimal = `0${decimal}`;
      if ( decimal.length === 2 ) decimal = `0${decimal}`;

      const ret =  `${wholeNum}.${decimal}`;
      return ret;
    };

    const addFiles = async (newFiles: File[]) => {
      disableDraggable.value = true;
      const promises = newFiles.map((file) => {
        return new Promise<void>((resolve) => {
          const reader = new FileReader();
          reader.onload = (e) => {
            const imgNumber = (file.name.includes('(')) 
              ? genImgNumber(file.name) || "0"
              :  file.name.match(/(\d+)/)?.[0] || "0";
            files.value.push({
              file,
              name: file.name,
              thumbnail: e.target?.result as string,
              imgNumber,
            });
            resolve();
          };
          reader.readAsDataURL(file);
        });
      });

      await Promise.all(promises);
      mitchSort();
      disableDraggable.value = false;
    };
    
    const mitchSort = () => {
      files.value.sort((a, b) => {
        const aNumber = parseFloat(a.imgNumber);
        const bNumber = parseFloat(b.imgNumber);
        return aNumber - bNumber;
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
          const y = padding + row * (maxSize.value + padding);
          const totalRowWidth =
            Math.min(imagesPerRow, resizedImages.length - row * imagesPerRow) *
            (maxSize.value + padding) -
            padding;
          const xOffset = (canvasWidth - totalRowWidth) / 2;
          const x = xOffset + col * (maxSize.value + padding);

          const centeredX = x + (maxSize.value - img.width) / 2;
          const centeredY = y + (maxSize.value - img.height) / 2;

          ctx!.drawImage(img, centeredX, centeredY, img.width, img.height);
        });

        // Generate preview URL as JPEG
        previewUrl.value = canvas.value.toDataURL("image/jpeg", 0.9);
      } catch (error) {
        console.error("Error generating contact sheet:", error);
      } finally {
        isLoading.value = false;
      }
    };

    const generateFilmStripContactSheet = async () => {
      if (!canvas.value) return;
      isLoading.value = true;

      const ctx = canvas.value.getContext("2d");
      const padding = 10; // Padding between images
      const filmStripBorder = 20; // Border width for the film strip
      const sprocketHoleSize = 10; // Size of the sprocket holes
      const sprocketHoleSpacing = 20; // Spacing between sprocket holes

      try {
        // Ensure all images are loaded and resized to portrait orientation
        const resizedImages = await Promise.all(
          files.value.map(async (fileObj) => {
            const img = await loadImage(fileObj.file);
            const resized = await resizeImage(img, maxSize.value);
            return resized;
          })
        );

        // Calculate canvas dimensions
        const canvasWidth = maxSize.value + 2 * filmStripBorder;
        const canvasHeight =
          resizedImages.length * (maxSize.value + padding) +
          padding +
          2 * filmStripBorder;

        canvas.value.width = canvasWidth;
        canvas.value.height = canvasHeight;

        // Draw the film strip background
        ctx!.fillStyle = "#000000"; // Black background for the film strip
        ctx!.fillRect(0, 0, canvasWidth, canvasHeight);

        // Draw sprocket holes on the left and right sides
        ctx!.fillStyle = "#ffffff"; // White sprocket holes
        for (
          let y = filmStripBorder;
          y < canvasHeight - filmStripBorder;
          y += sprocketHoleSpacing
        ) {
          // Left side
          ctx!.fillRect(
            filmStripBorder / 2 - sprocketHoleSize / 2,
            y,
            sprocketHoleSize,
            sprocketHoleSize
          );

          // Right side
          ctx!.fillRect(
            canvasWidth - filmStripBorder / 2 - sprocketHoleSize / 2,
            y,
            sprocketHoleSize,
            sprocketHoleSize
          );
        }

        // Draw images on the film strip
        resizedImages.forEach((img, index) => {
          const x = filmStripBorder + (canvasWidth - 2 * filmStripBorder - img.width) / 2;
          const y =
            filmStripBorder +
            padding +
            index * (maxSize.value + padding);
          ctx!.drawImage(img, x, y, img.width, img.height);
        });

        // Generate preview URL
        previewUrl.value = canvas.value.toDataURL("image/png");
      } catch (error) {
        console.error("Error generating film strip contact sheet:", error);
      } finally {
        isLoading.value = false;
      }
    };

    const downloadContactSheet = () => {
      const link = document.createElement("a");
      link.href = previewUrl.value!;
      link.download = fileName.value || "contact-sheet.jpeg";
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

      const localBackgroundColor = localStorage.getItem("DIGITAL_CONTACT_SHEET_BACKGROUND_COLOR");
      if (localBackgroundColor) backgroundColor.value = localBackgroundColor;
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
      disableDraggable,
      fileName,
      setSortOrder,
      setPxSize,
      setBackgroundColor,
      setAsFavorite,
      handleDrop,
      handleFileSelect,
      addFiles,
      triggerFileInput,
      generateContactSheet,
      generateFilmStripContactSheet,
      downloadContactSheet,
      loadImage,
      resizeImage,
      clearImages,
      mitchSort,
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
  padding: 5px 10px;
  background-color: #42b883;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.action-buttons button:disabled {
  background-color: #ccc;
  cursor: not-allowed;
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
.page-footer {
  margin-top: 2rem;
  display: flex;
  justify-content: center; /* Center align items horizontally */
  align-items: center; /* Center align items vertically */
  gap: 1rem; /* Add spacing between items */
  padding: 1rem;
  background-color: #2c2b2b;
  color: #ffffff;
}
.page-footer a {
  display: flex;
  align-items: center;
  text-decoration: none;
  color: inherit;
}
.page-footer .icon {
  width: 24px;
  height: 24px;
  fill: currentColor;
  transition: transform 0.2s ease;
}
.page-footer .icon:hover {
  transform: scale(1.2);
}
#file-name {
  width: 200px;
  padding: 5px;
  margin-top: 10px;
  border: 1px solid #ccc;
  border-radius: 4px;
}
</style>