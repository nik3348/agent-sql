import { Entity, PrimaryGeneratedColumn, Column } from "typeorm"

@Entity()
export class Users {
    @PrimaryGeneratedColumn()
    id!: number

    @Column()
    firstname!: string

    @Column()
    lastname!: string

    @Column()
    age!: number
}
