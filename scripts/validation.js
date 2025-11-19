
const pValidations = [
	{
		type: 'Pessoal: Promoção por Avaliação de Desempenho',
	 	stages: [{
			name: 'Instrução',
			neededDocs: [
				{
					title: 'Promoção por Avaliação de Desempenho - Professor',
					signed: true
				}
			],
		}]
	},

	{
		type: 'Documentação e Informação: Informática: Habilitação, Alteração ou Exclusão de Usuário (SIADS)',
		stages: [{
			name: 'Instrução',
			neededDocs: [{
				title: 'Cadastro de Requisitante de Materiais - SIADS',
				signed: true
			}]
		}]

	},

	{
		type: 'Projeto de Ensino',
		stages: [{
			name: 'Instrução',
			neededDocs: [{
				title: 'Projeto de Ensino',
				signed: true,
				warn: 'Preencha e assine um formulário do tipo Projeto de Ensino.'
			},
			{
				title: 'Despacho',
				signed: true,
				warn: 'Preencha um despacho para a coordenação de ensino do Instituto'
			}]
		}]

	}
];
