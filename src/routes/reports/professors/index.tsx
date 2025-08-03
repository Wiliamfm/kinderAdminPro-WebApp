import { component$ } from '@builder.io/qwik';
import { routeLoader$ } from '@builder.io/qwik-city';
import { BarPlot } from 'qwik-d3';
import Title from '~/components/common/title/title';
import { getStudents, useGetGrades } from '~/services/enrollment.service';
import { getEmployeeLeaves, getEmployees } from '~/services/payroll.service';

export { useGetGrades } from '~/services/enrollment.service';

export const getStudentsPerProfessor = routeLoader$(async (event) => {
  const students = await getStudents();
  const grades = await event.resolveValue(useGetGrades);
  const professors = await getEmployees();

  return professors.map(professor => {
    const professorGrades = grades.filter(g => g.professorId === professor.id).map(g => g.id);
    return {
      name: professor.name,
      value: students.filter(s => s.gradeId && professorGrades.includes(s.gradeId)).length
    }
  });
});

export const getLeavesPerProfessor = routeLoader$(async () => {
  const professors = await getEmployees();
  const professorWithLeaves = [];

  for (const professor of professors) {
    const leaves = await getEmployeeLeaves(professor.id);
    professorWithLeaves.push({
      name: professor.name,
      value: leaves.length
    })
  }

  return professorWithLeaves;
});

export default component$(() => {
  const studentsPerProfessorLoader = getStudentsPerProfessor();
  const leavesPerProfessorLoader = getLeavesPerProfessor();

  const maxStudents = studentsPerProfessorLoader.value.reduce((max, s) => Math.max(max, s.value), 0);
  const maxLeaves = leavesPerProfessorLoader.value.reduce((max, s) => Math.max(max, s.value), 0);

  return (
    <div style={{ height: '100%', width: '100%' }}>
      <div class="h-2/5">
        <Title title='Estudiantes por profesor' />
        <BarPlot data={studentsPerProfessorLoader.value} yAxisDomain={[0, maxStudents]} fill="#69b3a2" xAxis="name" />
      </div>
      <div class="h-2/5 m-20">
        <Title title='Incapacidades por profesor' />
        <BarPlot data={leavesPerProfessorLoader.value} yAxisDomain={[0, maxLeaves]} fill="#69b3a2" xAxis="name" />
      </div>
    </div>
  );
});
