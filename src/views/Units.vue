<template>
  <div>
    <!-- Filter Section -->
    <div class="container mt-4 mb-4">
      <div class="row">
        <!-- Course Dropdown -->
        <div class="col-12 col-md-4 mb-3">
          <select v-model="selectedCourse" class="form-select">
            <option value="all">All Courses</option>
            <option v-for="course in courses" :key="course" :value="course">
              {{ course }}
            </option>
          </select>
        </div>

        <!-- Part Dropdown -->
        <div class="col-12 col-md-4 mb-3">
          <select v-model="selectedPart" class="form-select">
            <option value="all">All Parts</option>
            <option v-for="part in parts" :key="part.id" :value="part">
              {{ part }}
            </option>
          </select>
        </div>

        <!-- Subject Dropdown -->
        <div class="col-12 col-md-4 mb-3">
          <select v-model="selectedSubject" class="form-select">
            <option value="all">All Subjects</option>
            <option v-for="subject in subjects" :key="subject.id" :value="subject">
              {{ subject }}
            </option>
          </select>
        </div>
      </div>
    </div>

    <!-- Search Box -->
    <div class="container d-flex justify-content-center mb-4">
      <input
        type="text"
        v-model="searchQuery"
        class="form-control w-75"
        placeholder="Search by Name, Part or Subject..."
      />
    </div>

    <!-- Units Display -->
   <!-- Units Display -->
<div class="container">
  <div class="row gy-4">
    <div
      v-for="unit in filteredUnits"
      :key="unit.id"
      class="col-12 col-sm-6 col-md-4 col-lg-3"
    >
      <div class="card h-100 p-3 shadow-sm bg-dark text-light" @click="goToUnit(unit.id)">
        <h5 class="text-info">{{ unit.title }}</h5>
        <p class="text-muted">{{ unit.desc }}</p>
        <div><small>class: {{ unit.course }}-{{ unit.part }}</small></div>
        <div><small>Subject: {{ unit.subject }}</small></div>
        <small>By: {{ unit.u_owner }}</small>
      </div>
    </div>
  </div>
</div>

  </div>
</template>


<script>
export default {
  name: 'UnitsGrid',
  data() {
    return {
      units: [],
      courses: [],
      parts: [],
      subjects: [],
      searchQuery: '',
      selectedCourse: 'all',
      selectedPart: 'all',
      selectedSubject: 'all'
    };
  },
  computed: {
    filteredUnits() {
      return this.units.filter(unit => {
        const matchesSearch =
          unit.title?.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
          // unit.subject?.toLowerCase().includes(this.searchTerm.toLowerCase())||

          // unit.u_desc?.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
          unit.subject?.toLowerCase().includes(this.searchQuery.toLowerCase());

        const matchesCourse =
          this.selectedCourse === 'all' ||
          unit.course.toLowerCase() === this.selectedCourse.toLowerCase();

        const matchesPart =
          this.selectedPart === 'all' ||
          unit.part.toLowerCase() === this.selectedPart.toLowerCase();

        const matchesSubject =
          this.selectedSubject === 'all' ||
          unit.subject.toLowerCase() === this.selectedSubject.toLowerCase();

        return matchesSearch && matchesCourse && matchesPart && matchesSubject;
      });
    }
  },
  methods: {
    goToUnit(id) {
      this.$router.push(`/pdf/${id}`);
    },
    // async fetchData() {
    //   try {
    //     const response = await fetch('/api/units/');
    //     const data = await response.json();
    //     this.units = data;

    //     // Extract distinct course/part/subject values
    //     const courseMap = {};
    //     const partMap = {};
    //     const subjectMap = {};

    //     data.forEach(unit => {
    //       if (!courseMap[unit.course.id]) courseMap[unit.course.id] = unit.course;
    //       if (!partMap[unit.part.id]) partMap[unit.part.id] = unit.part;
    //       if (!subjectMap[unit.subject.id]) subjectMap[unit.subject.id] = unit.subject;
    //     });

    //     this.courses = Object.values(courseMap);
    //     this.parts = Object.values(partMap);
    //     this.subjects = Object.values(subjectMap);
    //   } catch (error) {
    //     console.error('Failed to fetch units:', error);
    //   }
    // }
    async fetchData() {
  try {
    const response = await fetch('http://127.0.0.1:8000/api/units/');
    const data = await response.json();
    console.log(data); // Log the fetched data for debugging  
    this.units = data.units;

    // Extract distinct course/part/subject values
    const courseMap = {};
    const partMap = {};
    const subjectMap = {};

    data.units.forEach(unit => {
      if (!courseMap[unit.course.id]) courseMap[unit.course.id] = unit.course;
      if (!partMap[unit.part.id]) partMap[unit.part.id] = unit.part;
      if (!subjectMap[unit.subject.id]) subjectMap[unit.subject.id] = unit.subject;
    });

    this.courses = Object.values(courseMap);
    this.parts = Object.values(partMap);
    this.subjects = Object.values(subjectMap);
  } catch (error) {
    console.error('Failed to fetch units:', error);
  }
}

  },
  mounted() {
    this.fetchData();
  }
};
</script>
<!-- 
<style scoped>
.grid-container {
  display: grid;
  gap: 20px;
}

.container-border {
  margin: 20px 0;
}

.card1 {
  display: flex;
  justify-content: center;
}

.input-box {
  padding: 10px;
  border-radius: 8px;
  border: 1px solid #ccc;
  width: 100%;
  font-size: 16px;
  background-color: #f4f4f4;
}

.units-display {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 20px;
  margin-top: 20px;
}

.card {
  background-color: #f9f9f9;
  border: 1px solid #ddd;
  padding: 15px;
  border-radius: 10px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.card h5 {
  font-size: 18px;
  color: #00a4a4;
}

.card small {
  font-size: 14px;
  color: #4e6363;
}

.card:hover {
  cursor: pointer;
  background-color: #e5f7f7;
}

input[type="text"]:focus {
  outline: none;
  border-color: #00a4a4;
}

@media screen and (max-width: 768px) {
  .grid-container {
    grid-template-columns: 1fr;
  }
  .units-display {
    grid-template-columns: 1fr;
  }
}
</style> -->